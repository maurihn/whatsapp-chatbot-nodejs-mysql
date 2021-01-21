var express = require('express');
var router = express.Router();
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'SERVER',
  user     : 'USERNAME',
  password : 'PASSWORD',
  database : 'DATABASE',
});
const shimli = require('@sheilim/shimli-sdk');
shimli.config['token'] = 'YOUR_SHIMLI_TOKEN';

router.post('/webhook', async function(req, res) {
  //CHAT
  try{
    if(req.query.token === "TOKEN_WEBHOOK"){
      let item = req.body;
      if(item.fromMe == false && item.type == 'chat' && item.isGroupMsg == false){
        sendChatBot(item);
      }
      res.json({
        error: false
      })
    }else{
      res.json({
        error: true,
        text: 'INVALID TOKEN'
      })
    }
  }catch(err){
    console.log(err);
    res.json({
      error: true,
      text: err
    })
  }
});

const sendChatBot = async item =>{
    let txt_ = String(item.body).trim();
    // GET ID AND STATUS OF CONVERSATION
    let idconv = await getConv(item.from);
    ChatFlow_(item, txt_, idconv)
}

// CHATBOT FLOW EXAMPLE
const ChatFlow_ = async (item, txt, idconv) =>{
    let sender = item.from;
    
    if(idconv.status == 0){
      await shimli.sendMessage('chat', 'Hi, how can I help you today?\\n\\n1. Send Text\\n2. Send image', sender, 'ID_INSTANCE');
      // NEXT FLOW
      sql(`UPDATE tb_conv SET col_status = 1 WHERE col_phone = '${idconv.phone}'`);
    }

    if(idconv.status == 1){
      switch(parseInt(txt)){
        case 1:
          await shimli.sendMessage('chat', 'Hi, welocome to WhatsApp Chatbot', sender, 'ID_INSTANCE');
          sql(`UPDATE tb_conv SET col_status = 1 WHERE col_phone = '${idconv.phone}'`);
          setTimeout(() => {
            await shimli.sendMessage('chat', '1. Send Text\\n2. Send image', sender, 'ID_INSTANCE');
          },2000);
          break;
          case 2:
            await shimli.sendMessage('image','URL_IMAGE', sender, 'ID_INSTANCE');
            sql(`UPDATE tb_conv SET col_status = 1 WHERE col_phone = '${idconv.phone}'`);
            setTimeout(() => {
              await shimli.sendMessage('chat', '1. Send Text\\n2. Send image', sender, 'ID_INSTANCE');
            },2000);
            break;
        default:
          sendMessage(sender, 'Enter the number of the required action:\\n1. Send Text\\n2. Send image', item.idInstance);
          await shimli.sendMessage('chat', 'Enter the number of the required action:\\n1. Send Text\\n2. Send image', sender, 'ID_INSTANCE');
          break;
      }
    }
}

// CONECTION TO MYSQL
const sql = (sql_) =>{
  return new Promise((resolve, reject) =>{
    connection.query(sql_, function (error, results, fields) {
      if(error){
        reject({
          err: true,
          errText: error
        });
      }
      else{
        resolve({
          err: false,
          json: results
        });
      }
    });
  })
}

// GET CLIENT CONVERSATION BY PHONE NUMBER
// TABLE CONTENT 
// "ID" AUTO INCREMENT
// "PHONE" PHONE NUMBER OR WHATSAPP ID
// "STATUS" STATUS OF FLOW CONVERSATION
// "DATE" DATETIME WHEN CONVERSATION STARTS
const getConv = phone =>{
  return new Promise((resolve, reject) =>{
    connection.query(`SELECT * FROM tb_conv WHERE col_phone = '${phone}'`, function (error, results, fields) {
      if(error){
        console.error(error);
        sql(`INSERT INTO tb_conv VALUES(0, '${phone}', 0, NOW())`).catch(err =>{console.log(err)});
        resolve({phone, status: 0});
      }
      else{
        if(results.length > 0)
          resolve({phone, status: results[0].col_status});
        else{
          sql(`INSERT INTO tb_conv VALUES(0, '${phone}', 0, NOW())`).catch(err =>{console.log(err)});
          resolve({phone, status: 0});
        }
      }
    });
  })
}

module.exports = router;
