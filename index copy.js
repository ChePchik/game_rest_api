const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// Секретный ключ для JWT
const SECRET_KEY = "your_secret_key";
const USERS_FILE = "./users.json";

// для открытия сундука
let chest = 2;

// Функция для генерации случайных координат
function generateRandomCoordinates() {
	const x = Math.floor(Math.random() * 1000); // Генерация случайной координаты X
	const y = Math.floor(Math.random() * 1000); // Генерация случайной координаты Y
	return { x, y };
}
// проверить массив на массив
function isArraySubset(subset, superset) {
	return subset.every((element) => superset.includes(element));
}

// Загрузка пользователей из файла
function loadUsers() {
	if (fs.existsSync(USERS_FILE)) {
		return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
	}
	return [];
}

// Сохранение пользователей в файл
function saveUsers(users) {
	fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Генератор случайного слова из букв и цифр
function generateRandomWord(length) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

let users = loadUsers();

function GameEnd(req, res, next) {
	// const user = users.find((u) => u.username === req.user.username);
	console.log("🚀 ~ GameEnd ~ req.user:", req.user);
	// console.log("🚀 ~ GameEnd ~ user:", user);

	// Если жизни пользователя 0 или меньше
	// if (user && user.lives <= 0) {
	// 	return res.status(400).json({ message: "Вы проиграли! У вас не осталось жизней." });
	// }

	// Если жизней достаточно, продолжаем выполнение
	next();
}
// app.use();

// Миддлвар для проверки токена авторизации
function authenticateToken(req, res, next) {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (!token) return res.status(401).json({ message: "Ошибка авторизации" });

	jwt.verify(token, SECRET_KEY, (err, user) => {
		if (err) return res.status(403).json({ message: "Ошибка " || err.message });
		req.user = user;
		next();
	});
}

// Миддлвар для проверки последовательности выполнения маршрутов
function checkProgress(requiredProgress) {
	console.log("🚀 ~ checkProgress ~ requiredProgress:", requiredProgress);
	return (req, res, next) => {
		const user = users.find((u) => u.username === req.user.username);
		if (!user) return res.sendStatus(403);

		// console.log("🚀 ~ return ~ user.progress:", user.progress);
		// console.log("🚀 ~ return ~ requiredProgress:", requiredProgress);
		if (user.progress !== requiredProgress) {
			return res
				.status(400)
				.json({ message: "Вы должны выполнить предыдущие задания перед этим!" });
		}
		next();
	};
}

// Регистрация пользователя
app.post("/register", (req, res) => {
	const { username, password } = req.body;
	if (!username || !password) {
		return res
			.status(400)
			.json({ message: "username и password обязательно указываем теле ответа!" });
	}

	if (users.some((u) => u.username === username)) {
		return res.status(400).json({ message: "Пользователь с таким именем уже существует!" });
	}

	const newUser = { username, password, progress: 0, lives: 3 };
	users.push(newUser);
	saveUsers(users);

	res.status(201).json({ message: "Регистрация успешна! Теперь авторизовывайся" });
});

// Авторизация пользователя
app.post("/login", (req, res) => {
	const { username, password } = req.body;
	const user = users.find((u) => u.username === username && u.password === password);

	if (!user) {
		return res.status(401).json({ message: "Неверные учетные данные" });
	}

	const token = jwt.sign({ username: user.username }, SECRET_KEY);
	res.json({ token });
});

// Маршруты игры
app.get("/map", authenticateToken, checkProgress(0), (req, res) => {
	const user = users.find((u) => u.username === req.user.username);
	// console.log("🚀 ~ app.get ~ user:", user);
	// Генерация случайных координат
	const { x, y } = generateRandomCoordinates();

	// Запись координат в файл пользователя
	user.coordinates = { x, y };
	user.progress++;
	saveUsers(users);
	// Ответ с координатами
	res.json({
		message: "Вы нашли карту сокровищ! Теперь надо переместиться туда.",
		coordinates: `X: ${x}, Y: ${y}`,
	});
});

// Перейти к карте
app.get("/go/map", authenticateToken, checkProgress(1), (req, res) => {
	const user = users.find((u) => u.username === req.user.username);

	// Извлекаем координаты из параметров запроса
	const { x: x_new, y: y_new } = req.query;
	if (!x_new || !y_new) {
		user.lives--;
		saveUsers(users);
		res
			.status(401)
			.json({ message: "Ты совершил ошибку! Твоя жизнь на грани.", lives: user.lives });
	}

	const { x, y } = user.coordinates;
	if (x_new == x && y_new == y) {
		user.progress++;
		res.status(200).json({ message: `Вы нашли сундук сокровищ! Теперь надо открыть его.` });
	} else {
		user.lives--;
		saveUsers(users);
		res
			.status(401)
			.json({ message: "Ты совершил ошибку! Твоя жизнь на грани.", lives: user.lives });
	}
});

// Открыть сундук
app.post("/chest/open", authenticateToken, checkProgress(2), (req, res) => {
	console.log("🚀 ~ app.post ~ chest:", chest);
	const user = users.find((u) => u.username === req.user.username);

	// const { password } = req.body;
	// if (password === user.answer) {
	// 	const user = users.find((u) => u.username === req.user.username);
	// 	res.json({
	// 		message: "Сундук открыт!",
	// 		artifact: "Вы находите древний и могущественный артефакт!",
	// 		route: "Пора возвращаться на корабль.",
	// 	});
	// 	user.progress++;
	// 	saveUsers(users);
	// } else {
	res.json({
		message: "Сундук всё ещё закрыт! Ключ находится в старой башне(Им. падеж, через пробел).",
	});
	user.progress++;
	saveUsers(users);

	// user.lives--;
	// saveUsers(users);
	// res.status(401).json({ message: "Не верный пароль! Твоя жизнь на грани.", lives: user.lives });
	// }
});

// обновить маршрут
app.put("/map/update", authenticateToken, checkProgress(3), (req, res) => {
	const { new_route } = req.body;
	if (new_route && new_route == "старая башня") {
		const user = users.find((u) => u.username === req.user.username);
		res.json({ message: "Маршрут обновлен!", route: "GET /interact?id=1" });
		user.progress++;
		saveUsers(users);
	} else {
		res.status(401).json({ message: "Необходим указать новый маршрут(new_route)!" });
	}
});

// Загадка
app.get("/interact", authenticateToken, checkProgress(4), (req, res) => {
	const user = users.find((u) => u.username === req.user.username);
	const { id } = req.query;

	if (id && id == 1) {
		res.json({
			message: "Вы подошли к старой башне. На двери выбиты символы, похожие на загадку.",
			hint: "Решите загадку, чтобы получить пароль от сундука.",
			mystery: "",
		});
		user.progress++;
		saveUsers(users);
	} else {
		user.lives--;
		saveUsers(users);
		res.status(401).json({
			message: "Ты промахнулся и попал в разваливающуюся башню! Тебя придавило камнем.",
			lives: user.lives,
		});
	}
});

// Разгадка загадки
app.post("/solve", authenticateToken, checkProgress(5), (req, res) => {
	const user = users.find((u) => u.username === req.user.username);
	const { answer } = req.body;

	if (answer) {
		const answer = generateRandomWord(8);
		res.json({
			message: "Дверь башни открывается, и вы находите свиток с паролем:...",
			password: answer,
			// advice: "У вас один непрчитанный совет",
		});
		user.answer = answer;
		user.progress++;
		chest = 6;
		saveUsers(users);
	} else {
		res.status(404).json({
			message: "Не верный ответ. Жду от тебя answer",
			danger: "Твоё время на исходе",
		});
	}
});

// Открыть сундук
app.put("/chest/open", authenticateToken, checkProgress(6), (req, res) => {
	console.log("🚀 ~ app.post ~ chest:", chest);
	const user = users.find((u) => u.username === req.user.username);

	const { password } = req.body;
	if (password === user.answer) {
		const user = users.find((u) => u.username === req.user.username);
		res.json({
			message: "Сундук открыт!",
			artifact: "Вы находите древний и могущественный артефакт!",
			treasure: "Надо забарть все сокровища",
			// route: "Пора возвращаться на корабль.",
		});
		user.progress++;
		saveUsers(users);
	} else {
		res.json({
			message: "Сундук всё ещё закрыт! Ключ находится в старой башне(Им. падеж, через пробел).",
		});
		user.progress++;
		saveUsers(users);

		// user.lives--;
		// saveUsers(users);
		// res.status(401).json({ message: "Не верный пароль! Твоя жизнь на грани.", lives: user.lives });
	}
});

// собрать ресурсы
app.patch("/resources/add", authenticateToken, checkProgress(7), (req, res) => {
	const user = users.find((u) => u.username === req.user.username);
	const resurces = ["золото", "серебро", "оружие"];
	const { resources } = req.body;

	if (resources && typeof resources == "object" && isArraySubset(resurces, resources)) {
		res.json({
			message: "Все ресурсы собраны!",
			route: "Пора обратно на корабль. Проверь статус. экипажа",
		});
		user.progress++;
		saveUsers(users);
	} else {
		res.status(401).json({ message: "Ещё не всё сокровище собрано!", resources: resurces });
	}
});

// проверить статус
app.get("/crew/status", authenticateToken, checkProgress(8), (req, res) => {
	const user = users.find((u) => u.username === req.user.username);
	res.json({
		message: "Экипаж в порядке, готов к следующему заданию!",
		attack: "По пути вы встретили врагов!",
	});
	user.progress++;
	saveUsers(users);
});

// уничтожение врага
app.delete("/route/enemy", authenticateToken, checkProgress(9), (req, res) => {
	const user = users.find((u) => u.username === req.user.username);
	user.progress++;
	saveUsers(users);
	res.json({ message: `Враг уничтожен!` });
});

// app.post("/riddle/answer", authenticateToken, checkProgress(7), (req, res) => {
// 	const { answer } = req.body;
// 	if (answer === "parrot") {
// 		const user = users.find((u) => u.username === req.user.username);
// 		res.json({ message: "Верно! Загадка разгадана." });
// 		user.progress++;
// 		saveUsers(users);
// 	} else {
// 		res.status(400).json({ message: "Неправильный ответ!" });
// 	}
// });

// app.get("/treasure", authenticateToken, checkProgress(8), (req, res) => {
// 	const user = users.find((u) => u.username === req.user.username);
// 	res.json({ message: "Сокровище найдено! Это легендарный Золотой Якорь." });
// 	user.progress++;
// 	saveUsers(users);
// });

app.post("/journey/end", authenticateToken, checkProgress(10), (req, res) => {
	const { status } = req.body;
	// treasure
	if (status === "success") {
		const user = users.find((u) => u.username === req.user.username);
		res.json({ message: "Поздравляем! Вы завершили приключение и стали легендой." });
		// user.progress = 0; // Сброс прогресса для новой игры
		// saveUsers(users);
	} else {
		res.status(400).json({ message: "Ошибка завершения приключения!" });
	}
});

app.listen(PORT, () => {
	console.log(`Сервер запущен на http://localhost:${PORT}`);
});
