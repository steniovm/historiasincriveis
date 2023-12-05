//carrega bibliotecas
const fs = require('fs');
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const app = express();
//cria autenticação https
dotenv.config();
const local = process.env.ISLOCAL || false;
let server;
if (local){
  const privateKey  = fs.readFileSync('../server.key', 'utf8');
  const certificate = fs.readFileSync('../server.crt', 'utf8');
  const credentials = {key: privateKey, cert: certificate};
  server = require('https').createServer(credentials, app);
}else{
  server = require('http').createServer(app);
}
//cria servidor
const io = require('socket.io')(server);
//abre variaveis de ambiente
const port = process.env.PORT || 80;
const messlimit = process.env.MESSLIMIT || 100;

//configura servidor
app.use(cors());
app.use(express.static(path.join('public')));
app.set('views',path.join('public'));
app.engine('html',require('ejs').renderFile);
app.set('view engine', 'html');

//variaveis globais da aplicação
let narradores = [];
let messages = {};

const minvalueteste = process.env.MINVALUE || 3;
//executa rolagem de um dado
function roll(nfaces = 6){
  return Math.ceil(Math.random()*nfaces);
}
//executa teste de rolagem de dado
function testedice(dicetype, minvalue= 3){
  let testeroll;
  switch (dicetype) {
    case 'd4':
        testeroll = roll(4);
      break;
    case 'd6':
        testeroll = roll(6);
      break;
    case 'd8':
        testeroll = roll(8);
      break;
    case 'd10':
        testeroll = roll(10);
      break;
    case 'd12':
        testeroll = roll(12);
      break;
    case 'd20':
        testeroll = roll(20);
      break;
    case 'd100':
        testeroll = roll(100);
      break;
    default:
        testeroll = false;
      break;
  }
  if (testeroll){
    return {value: testeroll, result: (testeroll >= minvalue ? "sucesso" : "falha")}
  }else{
    return testeroll;
  }
}

//end-point da pagina estática
app.get('/', (req, res) => {
  console.log('acesso em:',path.join(__dirname, 'public'),'por get');
  res.sendFile('index.html', {root: path.join(__dirname, 'public')});
});
//end-point da pagina estática
app.post('/', (req, res) => {
  console.log('acesso em:',path.join(__dirname, 'public'),'por post');
  res.sendFile('index.html', {root: path.join(__dirname, 'public')});
});
//cria novo usuario tipo narrador
function newnarrador(user){
  let result = true;
  narradores.forEach(el=>{
    if (user.username === el.username){
      result = false;
    }
  });
  if (result){
    user.gamers=[];
    narradores.push(user);
    messages[user.username] = [];
  }
  return result;
}
//cria novo usuario tipo jogador
function newGamer(user){
  let result = {narrador:false, user:true, vaga:true, playnumber:0};
  narradores.forEach(el=>{
    if(user.narradorname === el.username){
      if (el.gamers.length>=3){
        result.vaga = false;
      }else{
        el.gamers.forEach(ele=>{
          if (user.username === ele.username){
            result.user = false;
          }
        });
      }

      if (result.user && result.vaga){
        el.gamers.push(user);
        result.playnumber = el.gamers.length;
      }
      result.narrador = true;
    }
  });
  return result;
}

//escuta conecção websocket
io.on('connection', function(socket){
  let room = '';
  let username = '';

  //console.log('usuario conectado com id:',socket.id);

  socket.on('sendUser', async (data) =>{
    //messages.push(data);
    username = data.username;
    data.sid = socket.id;
    //socket.broadcast.emit('receivedUser', data);
    if (data.typeuser === "narrador"){
      data.status = newnarrador(data);
      if (data.status){
        data.playnumber = 0;
        room = data.username;
        await socket.join(room);
      }
    }else{
      data.status = newGamer(data);
      if (data.status.narrador && data.status.user && data.status.vaga && data.status.playnumber){
        data.playnumber = data.status.playnumber;
        room = data.narradorname;
        await socket.join(room);
      }
    }
    if(messages[data.narradorname]){
      io.to(socket.id).emit('previousMessages',{username:data.username, hist:messages[data.narradorname]});
    }
    data.room = room;
    //console.log(data);
    //console.log(username,'acessou a sala:',room);
    if (room){
      const peersroom = [];
      narradores.forEach(async (el)=>{
        if (el.username===room){
          await io.to(room).emit('adduser', el);
          peersroom.push({peerid:el.peerid,usernumber: 0});
          el.gamers.forEach(async (ele,index)=>{
            peersroom.push({peerid:ele.peerid,usernumber: index+1});
            await io.to(room).emit('adduser', ele);
          });
        }
        await io.to(room).emit('addvideos', peersroom);
      });
    }
    else{socket.emit('adduser', data);}
  });

  socket.on('sendMessage', data =>{
    if (messages[room] !== undefined){
      messages[room].push(data);
      if (messages[room].length > messlimit){
        messages[room].shift();
      }
    }
    io.to(room).emit('receivedMessage', data);
  });

  socket.on('rollDice', data=>{//formato exemplo {user:'user', dicetype:'d6', minvalue:3}
    let result = testedice(data.dicetype, (data.minvalue ? data.minvalue : minvalueteste));
    result.user = data.user;
    result.dicetype = data.dicetype;
    //console.log(result);
    io.to(data.room).emit('roolresult', result);
  });

  socket.on('sendping', datatime=>{
    io.to(socket.id).emit('receivedpong', datatime);
  })

  socket.on('disconnect', () => {
    if (room) io.to(room).emit('removeuser', username);
    let index = -1;
    narradores.forEach((el,ind)=>{
      if (el.sid === socket.id){
        index = ind;
      }else{
        let gindex = -1;
        el.gamers.forEach((ele,inde)=>{
          if (ele.sid === socket.id){
            gindex = inde;
          }
        });
        if (gindex>=0){
          el.gamers.splice(gindex,1);
        }
      }
    });
    if (index>=0){
      delete messages[username];
      narradores.splice(index,1);
    }
    //console.log('usuario desconectado id:',socket.id, username);
  });
});

//escuta o servidor https
require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  server.listen(port, () =>{
    if (local){
      console.log(`para conversar acesse: https://${add}:${port}`);
      console.log(`ou: https://localhost:${port}`);
    }else{
      console.log(`para conversar acesse: http://${add}:${port}`);
      console.log(`ou: https://${add}:${port}`);
    }
    //console.log(err);
    //console.log(fam);
  });
  return true;
});
