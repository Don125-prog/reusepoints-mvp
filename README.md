1) Запустить в Ganache сессию.
2) пересобрать смарт-контракт npx truffle compile --all и  npx truffle migrate --reset --network development
3) вставить в файл .env в той же директории первый из предоставленных аккаунтов из Ganache TOKEN_CONTRACT_ADDRESS=0x...
4) проверерить node test-blockchain.js
5) запустить ai сервер ai_service> venv\Scripts\activate, python app.py 
6) npm start
