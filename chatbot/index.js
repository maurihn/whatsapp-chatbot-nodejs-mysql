var express = require('express');
var router = express.Router();
var request = require('request');
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'SERVER',
  user     : 'USERNAME',
  password : 'PASSWORD',
  database : 'DATABASE',
});

router.post('/webhook', async function(req, res) {
  //CHAT
  try{
    if(req.query.token === "TOKEN_WEBHOOK"){
      let item = req.body;
      if(item.ack == 0 && item.fromMe == false && item.type == 'chat' && item.group == false && !item.ticket){
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
    let idconv = await getConv(item.sender);
    ChatFlow_(item, txt_, idconv)
}

// CHATBOT FLOW EXAMPLE
const ChatFlow_ = async (item, txt, idconv) =>{
    let sender = item.sender;
    
    if(idconv.status == 0){
      sendMessage(sender, 'Hi, how can I help you today?\\n\\n1. Send Text\\n2. Send image', item.idInstance);
      // NEXT FLOW
      sql(`UPDATE tb_conv SET col_status = 1 WHERE col_phone = '${idconv.phone}'`);
    }

    if(idconv.state == 1){
      switch(parseInt(txt)){
        case 1:
          sendMessage(sender, 'Hi, welocome to WhatsApp Chatbot', item.idInstance);
          sql(`UPDATE tb_conv SET col_state = 1 WHERE col_phone = '${idconv.phone}'`);
          setTimeout(() => {
            sendMessage(sender, '1. Send Text\\n2. Send image', item.idInstance);
          },2000);
          break;
          case 2:
            sendImage(sender, 'URL_IMAGE', 'Hi, welcome to WhatsApp Chatbot', item.idInstance);
            sql(`UPDATE tb_conv SET col_state = 1 WHERE col_phone = '${idconv.phone}'`);
            setTimeout(() => {
              sendMessage(sender, '1. Send Text\\n2. Send image', item.idInstance);
            },2000);
            break;
        default:
          sendMsj(sender, 'Enter the number of the required action:\\n1. Send Text\\n2. Send image', item.idInstance);
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


// FUNCTIONS TO CONNECT TO SHIMLI
// 1. CREATE ACOUNT www.enviarwhatsapp.com
// 2. CONNECT WHATSAPP TO SHIMLI
// 3. GO TO SHIMLI MENU -> API -> TOKEN AND WEBHOOK
// 4. COPY TOKEN AND PASTE IT IN FUNCTIONS OF SHIMLI
// 5. SET URL ON WEBHOOK SHIMLI PLATFORM
const sendMessage = (phone, body, instance)=>{
  request.post({
    url: 'https://enviarwhatsapp.com/api/v2/send-msj?token=TOKEN',
    form: {
      phone: phone,
      body:body,
      instance: instance
    }
  }, function (e, r, body) {
    console.log('SHIMLI RESPONSE', body);
  })
}

const sendImage = (phone, url, caption, instance)=>{
  request.post({
    url: 'https://enviarwhatsapp.com/api/v2/send-image?token=TOKEN',
    form: {
      phone: phone,
      url:url,
      caption: caption,
      instance: instance
    }
  }, function (e, r, body) {
    console.log('SHIMLI RESPONSE', body);
  })
}

const createTicket = (dataTicket, queue)=>{
  request.post({
    url: 'https://enviarwhatsapp.com/api/v2/ticket?token=TOKEN',
    form: {
      dataTicket,
      queue
    }
  }, function (e, r, body) {
    console.log('SHIMLI RESPONSE', body);
  })
}

const addContact = (name, phone)=>{
  request.post({
    url: 'https://enviarwhatsapp.com/api/v2/contact/IDLIST?token=TOKEN',
    form: {
      name,
      phone
    }
  }, function (e, r, body) {
    console.log('SHIMLI RESPONSE', body);
  })
}

// END FUNCTIONS TO CONNECT TO SHIMLIS

module.exports = router;
