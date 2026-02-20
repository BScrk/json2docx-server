.PHONY: install dev start stop

install:
	. $$NVM_DIR/nvm.sh && nvm use && npm install

dev:
	. $$NVM_DIR/nvm.sh && nvm use && npx pm2 start ecosystem.config.js

start:
	. $$NVM_DIR/nvm.sh && nvm use && node server.js

stop:
	npx pm2 delete json2docx-server
