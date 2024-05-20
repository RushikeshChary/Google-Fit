require("dotenv").config();

const express = require("express");
const app = express();
const { google } = require("googleapis");
const request = require("request");
const cors = require("cors");
const urlParse = require("url-parse");
// const queryParse = require("query-string");
const bodyParser = require("body-parser");
const axios = require("axios");
// import url from "url";
const url = require("url");
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// const oAuth2Client = new google.auth.OAuth2(
//     process.env.CLIENT_ID,
//     process.env.CLIENT_SECRET,
//     process.env.REDIRECT_URI
//   );

const oAuth2Client = new google.auth.OAuth2(
  "42275004697-38am05ecrl4ipenhrn7b5l40rutp19qh.apps.googleusercontent.com",
  "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",
  // "http://localhost:3000/get-access"
  "https://google-fit.onrender.com/get-access"
);
const scopes = [
  "https://www.googleapis.com/auth/fitness.activity.read",
];


app.get("/", (req, res) => {
  //   res.send("Hello World");
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    // state: JSON.stringify({
    //   callbackUrl: req.body.callbackUrl,
    //   userID: req.body.userid,
    // }),
  });
  res.json({ url });
});

app.get("/get-access", async (req, res, next) => {
  const queryURL = new urlParse(req.url);
  const queryString = await import("query-string");
  const code = queryString.default.parse(queryURL.query).code;
  const tokens = await oAuth2Client.getToken(code);
  //console.log("token: ", tokens.tokens.access_token);
  // res.json({ token: tokens.access_token });
  // res.send("hello chary");
  let bucket = [];
  try {
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
          durationMillis: 24 * 60 * 60 * 1000
        },
        endTimeMillis: Date.now(),
        startTimeMillis: Date.now() - 24 * 60 * 60 * 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Request failed with status ${response.status}: ${errorData.error.message}`);
    }

    const result = await response.json();
    bucket = result.bucket;
    // console.log(result);
  } catch (e) {
    console.error('Error:', e.message);
  }

  try {
    for(const obj of bucket)
      {
        // console.log(obj.dataset);
        for(const points of obj.dataset)
          {
            // console.log(points.point);
            for(const values of points.point)
              {
                // console.log(values.value);
                for(const stepsobj of values.value)
                  {
                    //This is the step count.
                    let stepCount = stepsobj.intVal
                    console.log(`Step_Count is : ${stepCount}`);
                    if(stepCount >= 7500)
                      {
                        res.send(`Yes!! Congratulations.... You have completed your target for today with step count of ${stepCount}. You can try uptil 23:59 (today) if you did not reach your target. `)
                      }
                    else
                    {
                      res.send(`Your step count today is ${stepCount}. You can try uptil 23:59 (today) to reach your target.`)
                    }
                  }
              }
          }
      }
  } catch (e) {
    console.log('error: ' ,e);
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
