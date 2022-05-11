'use strict';

const line = require('@line/bot-sdk');
const axios = require('axios');
const creds = require('../credentials.json');

const express = require('express');
const app = express();

const { google } = require('googleapis');

const dotenv = require('dotenv');
const env = dotenv.config()

// create LINE SDK config from env variables
const lineConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const sheetConfig = {
  spreadsheetId: process.env.SPREADSHEET_ID,
}

const botConfig = {
  botCommandsPicture: process.env.BOTCOMMANDS_PHOTO,
}

// create LINE SDK client
const client = new line.Client(lineConfig);

app.get('/', (req, res) => {
  res.sendStatus(200)
})

app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  try {
    const event = req.body.events;
    return event.length > 0 ?
      await event.map(item => handleEvent(item)) :
      res.status(200).send("OK")
  } catch (error) {
    res.status(500).end();
  }
});

// event handler

const handleEvent = async (event) => {
  if (event.type === 'message' && event.message.type === 'text') {
    const { text } = event.message;
    const myArray = text.split(" ");
    const { sheets } = await authentication();
    const { userId, groupId } = (event.source);
    if (!groupId) {
      return null;
    }
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetConfig.spreadsheetId,
      range: 'Main',
    })

    let payload = {
      type: 'text',
      text: ``
    };
    let rows = res.data.values;
    let resultText = [];
    switch (myArray[0]) {
      case 'คำสั่งข้าวเช้า':
        payload = {
          type: "image",
          originalContentUrl: botCommandsPicture,
          previewImageUrl: botCommandsPicture
        }

        return client.replyMessage(event.replyToken, payload);

      case 'สรุปข้าวเช้า':
        if (rows.length !== 1) {
          for (let i = 1; i < rows.length; i++) {
            let spare = (rows[i][3] === undefined) ? `` : `สำรอง ${rows[i][3]}`;
            let result_text = `\t- ${rows[i][1]} : ${rows[i][2]} ${spare}\n`;
            resultText.push(result_text);
          }
          resultText = resultText.join("");
          console.log(`RESULT_TEXT: \n${resultText}`);
          payload = {
            type: 'text',
            text: `สรุปข้าวเช้า: \n` + resultText
          };
        } else {
          console.log("No order");
          payload = {
            type: 'text',
            text: `ยังไม่ได้สั่งข้าวเลยนะฮะ ʕ•́ᴥ•̀ʔっ \n` + resultText
          };
        }
        return client.replyMessage(event.replyToken, payload);

      case 'ข้าวเช้า':
        if (myArray[1] === undefined) {
          break;
        }
        const { displayName, pictureUrl } = await client.getGroupMemberProfile(`${groupId}`, `${userId}`)

        let date = new Date(event.timestamp);
        let dateString = (date.getDate() +
          "/" + (date.getMonth() + 1) +
          "/" + date.getFullYear() +
          " " + date.getHours() +
          ":" + date.getMinutes() +
          ":" + date.getSeconds());

        const storeData = [
          dateString,
          displayName,
          myArray[1],
          myArray[2],
        ]

        const writeReq = await sheets.spreadsheets.values.append({
          spreadsheetId: sheetConfig.spreadsheetId,
          range: 'Main',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [
              storeData,
            ],
          },
        })

        let arrayEmpty = "สำรอง"
        if (myArray[2] === undefined) {
          arrayEmpty = ""
          myArray[2] = "";
        }
        payload = {
          type: 'text',
          text: `น๊อล ${displayName}\nอยากกิน "${myArray[1]}" ${arrayEmpty}${myArray[2]} ครับแม่`
        };

        return client.replyMessage(event.replyToken, payload);

      case 'ตัดยอดข้าวเช้า':
        if (rows.length !== 1) {
          for (let i = 1; i < rows.length; i++) {
            let spare = (rows[i][3] === undefined) ? `` : `สำรอง ${rows[i][3]}`;
            let result_text = `\t- ${rows[i][1]} : ${rows[i][2]} ${spare}\n`;
            resultText.push(result_text);
          }
          resultText = resultText.join("");
          console.log(`RESULT_TEXT: \n${resultText}`);

          // * Store data to the backup sheet.
          const moveSheet = await sheets.spreadsheets.values.append({
            spreadsheetId: sheetConfig.spreadsheetId,
            range: 'Backup',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: rows,
            },
          })
          // * Delete data of the main sheet.
          const deleteData = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetConfig.spreadsheetId,
            resource: {
              requests: [
                {
                  "deleteDimension": {
                    "range": {
                      "sheetId": 0,
                      "dimension": "ROWS",
                      "startIndex": 1,
                      "endIndex": 999
                    }
                  }
                },
              ],
            },
          })

          payload = {
            type: 'text',
            text: `ตัดยอดข้าวเช้า: \n` + resultText
          };
        } else {
          console.log("No order");
          payload = {
            type: 'text',
            text: `ยังไม่ได้สั่งข้าวเลยนะฮะ ʕ•́ᴥ•̀ʔっ \n` + resultText
          };
        }
        return client.replyMessage(event.replyToken, payload);

      case 'ข้าวเช้าออกปุย':
        client.leaveGroup(`${groupId}`)
        break;

      case 'เมนูข้าวเช้า':

        // if ((myArray[1] === 'แก้ไข') && (myArray[2] !== undefined)) {
        //   const editMenu = await sheets.spreadsheets.values.update({
        //     spreadsheetId: sheetConfig.spreadsheetId,
        //     range: 'Menu',
        //     valueInputOption: 'USER_ENTERED',
        //     requestBody: {
        //       values: [
        //         myArray[2]
        //       ],
        //     },
        //   })
        // }

        const menu = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetConfig.spreadsheetId,
          range: 'Menu',
        })
        const menuString = menu.data.values;
        payload = {
          type: 'text',
          text: `${menuString[0][0]} \n`
        };
        return client.replyMessage(event.replyToken, payload);

      // case 'ยกเลิกข้าวเช้า':
      //   const Name = await client.getGroupMemberProfile(`${groupId}`, `${userId}`)
      //   const cancelName = Name.displayName.toString();

      //   const deleteData = await sheets.spreadsheets.values.batchClearByDataFilter({
      //     spreadsheetId: sheetConfig.spreadsheetId,
      //     resource: {
      //       "dataFilters": [
      //         {
      //           "developerMetadataLookup": {
      //             "metadataKey": cancelName
      //           }
      //         }
      //       ],
      //     },
      //   })
      //   break;

      default:
        return null;
    }
  } else {
    return null;
  }
}

const authentication = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets"
  });

  const _client = await auth.getClient();
  const sheets = google.sheets({
    version: 'v4',
    auth: _client
  });
  return { sheets }
}

// listen on port
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
