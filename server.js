const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;
const {
  getTokenBalance,
  getAccounts,
  rewardUser,
  spendUserTokens
} = require('./blockchain');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const USERS_FILE = path.join(__dirname, 'users.json');
const TRANSFERS_FILE = path.join(__dirname, 'refindings.json');
const PARTNERS_FILE = path.join(__dirname, 'partners.json');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'testsecret123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

async function readData(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data ? JSON.parse(data) : [];
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeData(filePath, []);
      return [];
    }
    console.error(`Ошибка чтения файла ${filePath}:`, err);
    return [];
  }
}

async function writeData(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}


async function getAIAdviceFromService(transfers, tokenBalance, reuseScore, achievements) {
  try {
    const response = await fetch('http://127.0.0.1:5001/advice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transfers,
        tokenBalance,
        reuseScore,
        achievements
      })
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка обращения к AI service:', error.message);

    // запасной локальный совет, чтобы ничего не ломалось
    return getAIAdvice(transfers, tokenBalance, reuseScore, achievements);
  }
}

function calculateReuseScore(transfers, tokenBalance) {
  const itemsCount = transfers.reduce((sum, item) => sum + item.quantity, 0);
  const categoriesCount = new Set(transfers.map(item => item.category)).size;

  let score = 0;
  score += Math.min(itemsCount * 10, 50);
  score += Math.min(categoriesCount * 15, 30);
  score += tokenBalance >= 50 ? 10 : 0;
  score += transfers.length >= 3 ? 10 : 0;

  return Math.min(score, 100);
}

function getReuseComment(score) {
  if (score >= 80) return 'Отличный результат! Вы активно участвуете в передаче вещей.';
  if (score >= 60) return 'Хороший уровень активности. Продолжайте в том же духе.';
  if (score >= 40) return 'Неплохо, но можно передавать вещи чаще.';
  if (score >= 20) return 'Хороший старт. Попробуйте передать ещё несколько вещей.';
  return 'Пока нет активности. Начните с первой передачи вещи.';
}

function getUserAchievements(transfers, tokenBalance) {
  const totalItems = transfers.reduce((sum, item) => sum + item.quantity, 0);
  const categoriesCount = new Set(transfers.map(item => item.category)).size;

  return [
    {
      title: 'Первая передача',
      description: 'Передайте первую вещь',
      completed: totalItems >= 1,
      progress: Math.min(totalItems * 100, 100)
    },
    {
      title: 'Добрый старт',
      description: 'Передайте 5 вещей',
      completed: totalItems >= 5,
      progress: Math.min((totalItems / 5) * 100, 100)
    },
    {
      title: 'Коллекционер бонусов',
      description: 'Накопите 50 токенов',
      completed: tokenBalance >= 50,
      progress: Math.min((tokenBalance / 50) * 100, 100)
    },
    {
      title: 'Разнообразие',
      description: 'Передайте вещи из 3 категорий',
      completed: categoriesCount >= 3,
      progress: Math.min((categoriesCount / 3) * 100, 100)
    }
  ];
}

function getAIAdvice(transfers, tokenBalance, reuseScore, achievements) {
  const totalItems = transfers.reduce((sum, item) => sum + item.quantity, 0);
  const categoriesCount = new Set(transfers.map(item => item.category)).size;
  const completedAchievements = achievements.filter(item => item.completed).length;

  if (totalItems === 0) {
    return {
      title: 'Первый шаг',
      text: 'Начните с первой передачи вещи — это поможет запустить ваш ReUse-прогресс и получить первые токены.'
    };
  }

  if (categoriesCount < 2) {
    return {
      title: 'Расширьте участие',
      text: 'Вы уже начали пользоваться платформой. Попробуйте передавать вещи из других категорий, чтобы повысить рейтинг и открыть новые достижения.'
    };
  }

  if (tokenBalance >= 50 && completedAchievements < achievements.length) {
    return {
      title: 'Используйте возможности',
      text: 'У вас накопилось достаточно токенов. Обменяйте часть из них на бонусы и продолжайте развивать активность в системе.'
    };
  }

  if (reuseScore >= 70) {
    return {
      title: 'Высокая активность',
      text: 'У вас высокий ReUse-score. Продолжайте передавать вещи регулярно, чтобы сохранять лидерский уровень вовлечённости.'
    };
  }

  if (totalItems >= 5 && categoriesCount >= 2) {
    return {
      title: 'Хорошая динамика',
      text: 'Вы уже активно участвуете в ReUsePoints. Следующий шаг — поддерживать регулярность и расширять разнообразие передаваемых вещей.'
    };
  }

  return {
    title: 'Продолжайте участие',
    text: 'Каждая переданная вещь помогает другим и повышает ваш вклад в экосистему ReUsePoints.'
  };
}

app.get('/', (req, res) => {
  res.redirect('/register');
});

app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/lk');

  res.render('registration', {
    error: req.session.error,
    message: req.session.message
  });

  delete req.session.error;
  delete req.session.message;
});

app.post('/register', async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    req.session.error = 'Пожалуйста, введите корректный email';
    return res.redirect('/register');
  }

  const users = await readData(USERS_FILE);

  if (users.some(u => u.email === email)) {
    req.session.error = 'Этот email уже зарегистрирован';
    return res.redirect('/register');
  }

  let account;

try {
  const ganacheAccounts = await getAccounts();

  if (!ganacheAccounts || ganacheAccounts.length <= 1) {
    req.session.error = 'Недостаточно Ganache аккаунтов. Убедитесь, что Ganache запущен.';
    return res.redirect('/register');
  }

  // Первый аккаунт Ganache не выдаём пользователям:
  // он используется как системный кошелёк платформы
  const availableAccounts = ganacheAccounts.slice(1);

  const usedAccounts = new Set(users.map(u => (u.account || '').toLowerCase()));

  account = availableAccounts.find(acc => !usedAccounts.has(acc.toLowerCase()));

  if (!account) {
    req.session.error = 'Свободные Ganache аккаунты закончились.';
    return res.redirect('/register');
  }
} catch (error) {
  console.error('Ошибка получения Ganache аккаунтов:', error.message);
  req.session.error = 'Не удалось получить адрес из Ganache. Проверьте, что Ganache запущен.';
  return res.redirect('/register');
}

  const newUser = {
    email,
    account,
    createdAt: new Date().toISOString(),
    tokenBalance: 0
  };

  users.push(newUser);
  await writeData(USERS_FILE, users);

  req.session.message = `Регистрация успешна. Ваш blockchain-аккаунт: ${account}`;
  res.redirect('/auth');
});

app.get('/auth', (req, res) => {
  if (req.session.user) return res.redirect('/lk');

  res.render('auth', {
    error: req.session.error,
    message: req.session.message
  });

  delete req.session.error;
  delete req.session.message;
});

app.post('/auth', async (req, res) => {
  const { email, blockchain_account } = req.body;

  const users = await readData(USERS_FILE);
  const user = users.find(
    u => u.email === email && u.account === blockchain_account
  );

  if (!user) {
    req.session.error = 'Неверный email или blockchain-аккаунт';
    return res.redirect('/auth');
  }

  req.session.user = {
    email: user.email,
    account: user.account
  };

  res.redirect('/lk');
});

app.get('/lk', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth');

  const users = await readData(USERS_FILE);
  const transfers = await readData(TRANSFERS_FILE);

  const currentUser = users.find(u => u.account === req.session.user.account);
  const userTransfers = transfers.filter(t => t.userAccount === req.session.user.account);

  let tokenBalance = 0;

  try {
    const rawBlockchainBalance = await getTokenBalance(currentUser.account);
    tokenBalance = Number(rawBlockchainBalance) / (10 ** 18);
  } catch (error) {
    console.error('Ошибка чтения баланса из блокчейна:', error.message);
  }


  const reuseScore = calculateReuseScore(userTransfers, tokenBalance);
  const reuseComment = getReuseComment(reuseScore);
  const achievements = getUserAchievements(userTransfers, tokenBalance);
  const aiAdvice = await getAIAdviceFromService(
    userTransfers,
    tokenBalance,
    reuseScore,
    achievements
  );

  const purchases = await readData(path.join(__dirname, 'purchases.json'));
  const userPurchases = purchases.filter(p => p.userAccount === req.session.user.account);

  const transferTransactions = userTransfers.map(item => ({
    type: 'Передача вещи',
    partner: `${item.title} (${item.category})`,
    amount: `+${item.reward}`,
    date: item.date
  }));

  const purchaseTransactions = userPurchases.map(item => ({
    type: 'Покупка бонуса',
    partner: item.name,
    amount: `-${item.amount}`,
    date: item.date
  }));

  const transactions = [...transferTransactions, ...purchaseTransactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  res.render('lk', {
    user: req.session.user,
    tokenBalance,
    transactions,
    reuseScore,
    reuseComment,
    achievements,
    aiAdvice
  });
});

app.get('/partners', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth');

  const partners = await readData(PARTNERS_FILE);
  const users = await readData(USERS_FILE);
  const currentUser = users.find(u => u.account === req.session.user.account);
  let tokenBalance = 0;

  try {
    const rawBlockchainBalance = await getTokenBalance(currentUser.account);
    tokenBalance = Number(rawBlockchainBalance) / (10 ** 18);
  } catch (error) {
    console.error('Ошибка чтения баланса из блокчейна:', error.message);
  }

  res.render('partners', {
    user: req.session.user,
    partners,
    tokenBalance,
    error: req.session.error,
    message: req.session.message
  });

  delete req.session.error;
  delete req.session.message;
});

app.post('/purchase-bonus', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth');

  const { partnerId } = req.body;

  const partners = await readData(PARTNERS_FILE);
  const users = await readData(USERS_FILE);

  const selectedPartner = partners.find(p => p.id == partnerId);
  const userIndex = users.findIndex(u => u.account === req.session.user.account);

  if (!selectedPartner) {
    req.session.error = 'Бонус не найден';
    return res.redirect('/partners');
  }

  if (userIndex === -1) {
    req.session.error = 'Пользователь не найден';
    return res.redirect('/auth');
  }

  let blockchainBalance = 0;

  try {
    const rawBlockchainBalance = await getTokenBalance(req.session.user.account);
    blockchainBalance = Number(rawBlockchainBalance) / (10 ** 18);
  } catch (error) {
    console.error('Ошибка чтения баланса из блокчейна при покупке бонуса:', error.message);
    req.session.error = 'Не удалось проверить blockchain-баланс.';
    return res.redirect('/partners');
  }

if (blockchainBalance < selectedPartner.tokens) {
  req.session.error = 'Недостаточно токенов для покупки бонуса';
  return res.redirect('/partners');
}

  try {
    await spendUserTokens(req.session.user.account, selectedPartner.tokens);
  } catch (error) {
    console.error('Ошибка списания токенов в blockchain:', error.message);
    req.session.error = 'Не удалось списать токены через blockchain.';
    return res.redirect('/partners');
  }

  const purchases = await readData(path.join(__dirname, 'purchases.json'));

  purchases.push({
    userAccount: req.session.user.account,
    name: selectedPartner.name,
    amount: selectedPartner.tokens,
    date: new Date().toISOString()
  });

  await writeData(path.join(__dirname, 'purchases.json'), purchases);
  
  await writeData(USERS_FILE, users);

  req.session.message = `Вы купили бонус: ${selectedPartner.name}`;
  res.redirect('/partners');
});

app.get('/recycle-points', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth');

  const users = await readData(USERS_FILE);
  const currentUser = users.find(
    u => u.account === req.session.user.account
  );

  const transfers = await readData(TRANSFERS_FILE);
  const userTransfers = transfers.filter(
    t => t.userAccount === req.session.user.account
  );

  let tokenBalance = 0;

  try {
    const rawBlockchainBalance = await getTokenBalance(currentUser.account);
    tokenBalance = Number(rawBlockchainBalance) / (10 ** 18);
  } catch (error) {
    console.error('Ошибка чтения баланса из блокчейна:', error.message);
  }
  const reuseScore = calculateReuseScore(userTransfers, tokenBalance);
  const achievements = getUserAchievements(userTransfers, tokenBalance);
  const aiAdvice = await getAIAdviceFromService(
    userTransfers,
    tokenBalance,
    reuseScore,
    achievements
  );

  const pickupPoints = [
    {
      name: 'ReUse Центр Таганская',
      address: 'Москва, ул. Таганская, 12',
      hours: 'Ежедневно, 10:00–20:00',
      categories: 'Одежда, книги, обувь',
      mapUrl: 'https://yandex.ru/maps/?text=Москва%20ул.%20Таганская%2012'
    },
    {
      name: 'Пункт Добрые вещи',
      address: 'Москва, ул. Новослободская, 18',
      hours: 'Пн–Сб, 11:00–19:00',
      categories: 'Игрушки, одежда, вещи для дома',
      mapUrl: 'https://yandex.ru/maps/?text=Москва%20ул.%20Новослободская%2018'
    },
    {
      name: 'Эко-приём Тверская-Ямская',
      address: 'Москва, 1-я Тверская-Ямская, 7',
      hours: 'Ежедневно, 09:00–21:00',
      categories: 'Книги, электроника, аксессуары',
      mapUrl: 'https://yandex.ru/maps/?text=Москва%201-я%20Тверская-Ямская%207'
    }
  ];

  res.render('recycle-points', {
    user: req.session.user,
    tokenBalance,
    error: req.session.error,
    message: req.session.message,
    pickupPoints,
    aiAdvice
  });

  delete req.session.error;
  delete req.session.message;
});

app.post('/recycle-submit', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth');

  const { title, category, quantity } = req.body;

  if (!title || !category) {
    req.session.error = 'Заполните название вещи и категорию';
    return res.redirect('/recycle-points');
  }

  const quantityNum = parseInt(quantity);
  if (isNaN(quantityNum) || quantityNum <= 0) {
    req.session.error = 'Введите корректное количество';
    return res.redirect('/recycle-points');
  }

  const rewardPerItem = 10;
  const reward = quantityNum * rewardPerItem;

  const users = await readData(USERS_FILE);
  const transfers = await readData(TRANSFERS_FILE);

  const userIndex = users.findIndex(u => u.account === req.session.user.account);
  if (userIndex === -1) {
    req.session.error = 'Пользователь не найден';
    return res.redirect('/auth');
  }

  // users[userIndex].tokenBalance += reward;

  try {
    await rewardUser(req.session.user.account, reward);
  } catch (error) {
    console.error('Ошибка начисления токенов в blockchain:', error.message);
  }

  const newTransfer = {
    userAccount: req.session.user.account,
    title,
    category,
    quantity: quantityNum,
    reward,
    date: new Date().toISOString()
  };

  transfers.push(newTransfer);

  await writeData(USERS_FILE, users);
  await writeData(TRANSFERS_FILE, transfers);

  req.session.message = `Вещь передана. Начислено ${reward} токенов.`;
  res.redirect('/recycle-points');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth');
  });
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});