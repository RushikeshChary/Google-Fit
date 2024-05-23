require("dotenv").config();

const express = require("express");
const app = express();
const { google } = require("googleapis");
// const request = require("request");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const urlParse = require("url-parse");
// const queryParse = require("query-string");
const bodyParser = require("body-parser");
// const axios = require("axios");
const User = require("./models/userinfo.js");
// import url from "url";
// const url = require("url");
const Port = process.env.PORT || 3000;



mongoose
.connect('mongodb+srv://rushi:rushi@cluster.8ailuyg.mongodb.net/Google-Fit?retryWrites=true&w=majority&appName=Cluster')
.then(result => {
    app.listen(Port, () => {
      console.log('Database connection established');
      console.log(`Server is running at http://localhost:${Port}`);
    });
})
.catch(err => console.log(err));

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


const oAuth2Client = new google.auth.OAuth2(
  "42275004697-38am05ecrl4ipenhrn7b5l40rutp19qh.apps.googleusercontent.com",
  "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",
  // "http://localhost:3000/get-access"
  "https://google-fit.onrender.com/get-access"
);
const scopes = [
  "https://www.googleapis.com/auth/fitness.activity.read profile email openid",
];


app.get("/", (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.json({ url });
});

// Function to decode JWT token (id_token) to extract user information
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
}

// app.get("/create", async (req, res) => {
//   const user = await User.findOne({ userName: 'Chary' });
//     // A new user is being encounterd. Save this user.
//     if(user) res.json({ user: user});
//     else{
//     userName = 'Chary'
//     const newUser = {
//       userName,
//       score: 0
//     };
//     const savedUser = await User.create(newUser);
//     console.log("New user saved successfully:", savedUser);
//     res.json({savedUser: savedUser});
//   }
// })

app.get("/get-access", async (req, res, next) => {
  const queryURL = new urlParse(req.url);
  const queryString = await import("query-string");
  const code = queryString.default.parse(queryURL.query).code;
  const tokens = await oAuth2Client.getToken(code);
  // console.log("token: ", tokens);
  // Extract user information from the id_token
  const decodedToken = parseJwt(tokens.tokens.id_token);
  const userName = decodedToken.name;
  // console.log('User Name:', userName);
  // console.log('access token: ', tokens.tokens.access_token);
  let user = await User.findOne({ userName: userName });
  // console.log('Old user: ', user);
  if (!user) {
    // A new user is being encounterd. Save this user.
    const newUser = {
      userName: userName,
      score: 0
    };
    user = await User.create(newUser);
    // console.log("New user saved successfully:", user);
  }
  
  // res.send("hello chary");
  let bucket = [];
  try {
    // Get the current date and time
    const now = new Date();

    // Set endTimeMillis to the current time
    const endTimeMillis = now.getTime();

    // Create a new Date object for the start of the current day (00:00)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Set startTimeMillis to the start of the current day
    const startTimeMillis = startOfDay.getTime();
    const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + tokens.tokens.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        aggregateBy: [
          {
            dataTypeName: 'com.google.step_count.delta',
            dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
          }
        ],
        bucketByTime: {
          durationMillis: 15 * 60 * 1000
        },
        endTimeMillis: endTimeMillis,
        // endTimeMillis: Date.now(),
        startTimeMillis: startTimeMillis
        // startTimeMillis: Date.now() - 4 * 60 * 60 * 1000
      })
    });

    // console.log(`Start time: ${startTimeMillis}`)
    // console.log(`End time: ${endTimeMillis}`)
    // let diff = (endTimeMillis - startTimeMillis)/(60*60*1000);
    // console.log(`Difference: ${diff}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Request failed with status ${response.status}: ${errorData.error.message}`);
    }

    // console.log(response);
    const result = await response.json();
    // console.log(result);
    bucket = result.bucket;
    // console.log(result);
  } catch (e) {
    console.error('Error:', e.message);
  }

  try {
    // Parse and log the step count data
    let totalSteps = 0;
    if (bucket && bucket.length > 0) {
      bucket.forEach(b => {
        // console.log(b);
        b.dataset.forEach(dataset => {
          
          dataset.point.forEach(point => {
            if (point.value && point.value.length > 0) {
              // console.log(point.value[0].intVal);
              totalSteps += point.value[0].intVal || 0;
            }
          });
        });
      });
    }
    
    console.log('Total steps:', totalSteps);
    
    if (totalSteps > 7500) {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
  
      // Check if the time is after 23:30
      if (hours > 23 || (hours === 23 && minutes >= 30)) {
        user.score += 10;
        await user.save();
        console.log('User score updated');
      }
      else{
        console.log('User score not updated');
      }
    }
    let score = user.score;
    return res.json({ totalSteps,userName,score});
    // for(const obj of bucket)
    //   {
    //     // console.log(obj.dataset);
    //     for(const points of obj.dataset)
    //       {
    //         // console.log(points.point);
    //         for(const values of points.point)
    //           {
    //             // console.log(values.value);
    //             let stepCount = 0;
    //             for(const stepsobj of values.value)
    //               {
    //                 //This is the step count.
    //                 stepCount += stepsobj.intVal
                    
    //               }
    //               console.log(`Step_Count is : ${stepCount}`);
    //               if(stepCount >= 7500)
    //                 {
    //                   res.send(`Yes!! Congratulations.... You have completed your target for today with step count of ${stepCount}. You can try uptil 23:59 (today) if you did not reach your target. `)
    //                 }
    //               else
    //               {
    //                 res.send(`Your step count today is ${stepCount}. You can try uptil 23:59 (today) to reach your target.`)
    //               }
    //           }
    //       }
    //   }
  } catch (e) {
    console.log('error: ' ,e);
  }
});


// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });
