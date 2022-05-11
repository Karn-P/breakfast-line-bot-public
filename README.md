# Breakfast-line-bot

This server is build for supporting the breakfast line bot.

## How to use

### Install dependencies

```shell
$ npm install
```

### Configuration

```shell
$ export PORT=4000
$ export CHANNEL_SECRET=YOUR_CHANNEL_SECRET
$ export CHANNEL_ACCESS_TOKEN=YOUR_CHANNEL_ACCESS_TOKEN
$ export SPREADSHEET_ID=YOUR_GOOGLE_SPREADSHEET_ID
$ export BOTCOMMANDS_PHOTO=BOTCOMMAND_PHOTO
```

### Run

```shell
$ npm start

or use nodemon to run automatically.

$ npm run dev
```

## Webhook URL

```
https://your.base.url/webhook
```
