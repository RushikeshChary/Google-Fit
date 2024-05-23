const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  userName: {
    type: String,
    required: true
  },
  score:
  {
    type: Number,
    required: true
  },
},{ timestamps: true });

//Collection name has to be Users.
const User = mongoose.model("User", userSchema);
module.exports = User;
