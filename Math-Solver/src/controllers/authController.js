const db = require('../config/database');

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

exports.googleLogin = (req, res) => {
  try {
    const { credential, userData } = req.body;
    let userInfo = null;

    if (credential) {
      const decoded = parseJwt(credential);
      if (decoded && decoded.email) {
        userInfo = {
          email: decoded.email.trim().toLowerCase(),
          name: decoded.name || decoded.given_name || decoded.email.split('@')[0],
          picture: decoded.picture || '',
          provider: 'google'
        };
      }
    }

    if (!userInfo && userData && userData.email) {
      userInfo = {
        email: userData.email.trim().toLowerCase(),
        name: userData.name && userData.name.trim() !== '' ? userData.name.trim() : userData.email.split('@')[0],
        picture: userData.picture || '',
        provider: 'google'
      };
    }

    if (!userInfo || !userInfo.email) {
      return res.status(400).json({ success: false, error: 'Valid Google email is required.' });
    }

    const savedUser = db.saveOrUpdateUser(userInfo);

    res.json({
      success: true,
      message: 'Google account authenticated and stored in database.json successfully',
      user: savedUser
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.emailLogin = (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name && name.trim() !== '' ? name.trim() : cleanEmail.split('@')[0];
    
    const savedUser = db.saveOrUpdateUser({
      email: cleanEmail,
      name: cleanName,
      provider: 'email'
    });
    res.json({ success: true, user: savedUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCurrentUsers = (req, res) => {
  try {
    const users = db.getUsers();
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
