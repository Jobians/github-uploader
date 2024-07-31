require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const multer = require('multer');
const unzipper = require('unzipper');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const simpleGit = require('simple-git');
const tmp = require('tmp');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3060;
const clientSecret = process.env.GITHUB_CLIENT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const redirectUri = isProduction 
  ? process.env.GITHUB_REDIRECT_URI 
  : process.env.GITHUB_LOCAL_REDIRECT_URI;
const clientId = process.env.GITHUB_CLIENT_ID;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, file.originalname)
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/zip') {
    cb(null, true);
  } else {
    cb(new Error('Only zip files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/auth/github', (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user:email`;
  res.redirect(url);
});

app.get('/auth/github/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: clientId,
      client_secret: clientSecret,
      code: code
    }, {
      headers: {
        accept: 'application/json'
      }
    });

    if (response.status === 200 && response.data.access_token) {
      const accessToken = response.data.access_token;
      res.send(`
        <script>
          localStorage.setItem('github_token', '${accessToken}');
          window.location.href = '/';
        </script>
      `);
    } else {
      if (response.data.error) {
        res.status(400).send(`
          <script>
            alert('Error: ${response.data.error_description}');
            window.location.href = '/';
          </script>
        `);
      } else {
        res.status(500).send('Failed to obtain access token from GitHub');
      }
    }
  } catch (error) {
    console.error('Error during GitHub OAuth:', error);
    res.status(500).send('Error during GitHub OAuth');
  }
});

app.post('/upload', (req, res) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, async (err) => {
    if (err) {
      return res.send({ ok: false, error: err.message });
    }
    
    const token = req.query.token;
    const branchName = req.body.branchName;
    const repoName = req.body.repoName;
    const createRepo = req.body.createRepo === 'true';
    const commitMessage = req.body.commitMessage || 'Add or update directory contents';

    if (!token) {
      return res.send({ ok: false, error: 'Missing access token' });
    }
    
    if (!branchName || !repoName) {
      return res.send({ ok: false, error: 'Branch name and repository name are required' });
    }

    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
    const zipPath = path.join('uploads', req.file.filename);

    try {
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`
        }
      });
      const emailsResponse = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `token ${token}`
        }
      });
      
      const email = emailsResponse.data.length > 0 ? emailsResponse.data[0].email : 'jobianstechie@gmail.com';
      const username = userResponse.data.login;

      const remoteRepoUrl = `https://x-access-token:${token}@github.com/${username}/${repoName}.git`;
      const git = simpleGit(tmpDir);

      try {
        await axios.get(`https://api.github.com/repos/${username}/${repoName}`, {
          headers: {
            Authorization: `token ${token}`
          }
        });
        await git.clone(remoteRepoUrl, tmpDir);
      } catch (error) {
        if (error.response && error.response.status === 404) {
          if (createRepo) {
            await axios.post('https://api.github.com/user/repos', {
              name: repoName,
              private: false
            }, {
              headers: {
                Authorization: `token ${token}`
              }
            });

            await git.init();
            await git.addRemote('origin', remoteRepoUrl);
          } else {
            throw new Error('Repository does not exist.');
          }
        } else {
          throw error;
        }
      }

      git.cwd(tmpDir);
      await git.addConfig('user.name', username);
      await git.addConfig('user.email', email);
      
      const branches = await git.branch();
      if (!branches.all.includes(branchName)) {
        await git.checkoutLocalBranch(branchName);
      } else {
        await git.checkout(branchName);
      }
      
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: tmpDir }))
        .on('close', async () => {
          try {
            await git.add('.');
            await git.commit(commitMessage);
            await git.push('origin', branchName);

            res.send({ ok: true, message: 'Directory uploaded successfully' });
          } catch (error) {
            console.error('Error during git operations:', error);
            res.send({ ok: false, error: error.message || 'Error during git operations' });
          }
        })
        .on('error', (err) => {
          console.error('Error during unzip operation:', err);
        });
    } catch (error) {
      console.error('Error uploading directory:', error);
      res.send({ ok: false, error: error.message || 'Error uploading directory' });
    } finally {
      tmp.setGracefulCleanup();
      fs.access(zipPath, fs.constants.F_OK, (err) => {
        if (!err) {
          fs.unlink(zipPath, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting zip file:', unlinkErr);
          });
        }
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});