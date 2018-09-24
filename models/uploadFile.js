var mongoose = require('mongoose'), Schema = mongoose.Schema;
var crypto = require('crypto');

var UploadFileSchema = new mongoose.Schema({
  User: { type: Schema.Types.ObjectId, ref: 'User' },
  FileName: { type: String, required: true, trim: true },
  OriginalMD5: String,
  OriginalSize:
    {
      type: Number, min: 0,
      validate : {
        validator : Number.isInteger,
        message: '{VALUE} is not an integer value'
      }
    }
  ,
  UploadedMD5: String,
  UploadedSize:
    {
      type: Number, min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value'
      }
    }
  ,
  ComputedMD5: String,
  Data: { type: Buffer, required: true }
});

//hashing a password before saving it to the database
UploadFileSchema.pre('save', function (next) {
  var uploadFile = this;
  var hash = crypto.createHash('md5');

  var computed = hash.update(this.Data);
  var hexHash = computed.digest('hex');

  uploadFile.ComputedMD5 = hexHash;
  next();
});

var UploadFile = mongoose.model('UploadFile', UploadFileSchema);
module.exports = UploadFile;

