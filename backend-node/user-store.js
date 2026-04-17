const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');

class UserStore {
  constructor() {
    this.ensureDataFile();
  }

  ensureDataFile() {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf8');
    }
  }

  async getAllUsers() {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  }

  async findByEmail(email) {
    const users = await this.getAllUsers();
    return users.find(u => u.email === email);
  }

  async createUser(userData) {
    const users = await this.getAllUsers();
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const newUser = {
      id: Date.now().toString(),
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      smtp: {
        host: '',
        port: 587,
        user: '',
        pass: ''
      },
      history: [],
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return newUser;
  }

  async updateSmtp(userId, smtpData) {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;

    users[userIndex].smtp = { ...users[userIndex].smtp, ...smtpData };
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return users[userIndex];
  }

  async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password);
  }

  async getHistory(userId) {
    const users = await this.getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return [];
    return user.history || [];
  }

  async addHistory(userId, entry) {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;

    if (!users[userIndex].history) users[userIndex].history = [];
    users[userIndex].history.unshift(entry);
    
    // Limit history to 100 entries
    if (users[userIndex].history.length > 100) {
      users[userIndex].history.pop();
    }

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return users[userIndex].history;
  }

  async deleteHistory(userId, entryId) {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;

    users[userIndex].history = users[userIndex].history.filter(e => String(e.id) !== String(entryId));
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return users[userIndex].history;
  }

  async clearHistory(userId) {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;

    users[userIndex].history = [];
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return [];
  }
}

module.exports = new UserStore();
