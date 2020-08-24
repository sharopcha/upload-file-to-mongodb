const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const gridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

// Middleware
app.use(express.json());
app.use(methodOverride('_method'));

// Mongo URI
const mongoURI =
  'mongodb+srv://napster:Lutfiya1202@upload-file-with-gridfs.gdide.mongodb.net/upload-file-with-gridFS?retryWrites=true&w=majority';

// Create Mongo connection
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Init gfs
let gfs;

conn.once('open', () => {
  // init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new gridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }

        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename,
          bucketName: 'uploads',
        };
        resolve(fileInfo);
      });
    });
  },
});

const upload = multer({ storage });

app.set('view engine', 'ejs');
// @rote        GET /
// @desc        Loads form
app.get('/', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // chek if files exist
    if (!files || files.length === 0) {
      res.render('index', { files: false });
    } else {
      files.map(file => {
        if (
          file.contentType === 'image/jpeg' ||
          file.contentType === 'image/jpg' ||
          file.contentType === 'image/png'
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });

      res.render('index', { files });
    }
  });
});

// @route       POST /upload
// @desc        Uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {
  //   res.json({ file: req.file });
  res.redirect('/');
});

// @route       GET /files
// @desc        Display all files in JSON
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // chek if files exist
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist',
      });
    }

    // files exist
    res.json(files);
  });
});

// @route       GET /files/:filename
// @desc        Get single file based on its name
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No files exist',
      });
    }

    // file exits
    return res.json(file);
  });
});

// @route       GET /image/:filename
// @desc        Display image
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No files exist',
      });
    }

    // chek if image
    if (
      file.contentType === 'image/jpeg' ||
      file.contentType === 'image/jpg' ||
      file.contentType === 'image/png'
    ) {
      // read output to browser
      const readStream = gfs.createReadStream(file.filename);

      readStream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image',
      });
    }
  });
});

// @route       DELETE /files/:id
// @desc        Delete file
app.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.redirect('/');
  });
});

const PORT = 5040;

app.listen(PORT, () => {
  console.log(`Server started on port: ${PORT}`);
});
