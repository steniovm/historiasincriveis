//elementos html
const chat = document.getElementById("chat");
const submitbt = document.getElementById("submitbt");
const username = document.getElementById("username");
const message = document.getElementById("message");
const messages = document.getElementById("messages");
const modal = document.getElementById("modal");
const modalform = document.getElementById("modalform");
const inusername = document.getElementById("inusername");
const typenarrador = document.getElementById("typenarrador");
const typeplayer = document.getElementById("typeplayer");
const typeorigindice = document.getElementById("typeorigindice");
const typesimpledice = document.getElementById("typesimpledice");
const typefulldice = document.getElementById("typefulldice");
const narrinfos = document.getElementById("narrinfos");
const caracterinfos = document.getElementById("caracterinfos");
const narradorname = document.getElementById("narradorname");
const caractername = document.getElementById("caractername");
const skillD12 = document.getElementById("skillD12");
const skillD10 = document.getElementById("skillD10");
const skillD8 = document.getElementById("skillD8");
const skillD6 = document.getElementById("skillD6");
const decriptcaracter = document.getElementById("decriptcaracter");
const submituser = document.getElementById("submituser");
const showusername = document.getElementsByClassName("showusername");
const caracterinfo = document.getElementsByClassName("caracterinfo");
const dicebt = document.getElementsByClassName("dicebt");
const onedicebt = document.getElementById("OneDicebt");
const mediabt = document.getElementsByClassName("mediabt");
const mainusers = document.getElementById("mainusers");
const showuserdiv = document.getElementsByClassName("showuserdiv");
const instruct = document.getElementById("instruct");
const framehelp = document.getElementById("framehelp");
const skillsnames = document.querySelectorAll('.dicebt>span');
const caracterinfosinput = document.querySelectorAll('#caracterinfos input');
const optionaldice = document.querySelectorAll('.optional');
const origdice = document.querySelectorAll('.origdice');
const savedcaracters = document.getElementById("savedcaracters");
//encontra porta de comunicação
const PORT =
  location.protocol === "https:" ? 443 : location.port ? location.port : 3000;
//configura estado de audio e video padrão
const mediaopt = { video: true, audio: true };
//variaveis globais
let userdata = {};//dados do usuario
let users = {};//lista de usuarios
let streams = {};//lista de streams reproduziveis
let minvalueteste = 3;//valor minimo para sucesso nos teste de rolagem de dados
let socket;
let peer;

//configura conexões
let isconnect = configConections();
async function configConections(){
  try {
    socket = await io();//conexão de socket
    peer = await new Peer();//conexão p2p
    //escutas de conexão
    peer.on('open', connectopen);//abre conexão com o servidor
    socket.on('adduser', createuser);//escuta usuario criado no servidor
    socket.on('previousMessages', premessages);//recebe mensagens anteriores a entrada do usuário
    socket.on('removeuser', removeuser);// remove usuario que desconectou
    socket.on('roolresult', roolresult);//escuta rolagem de dados
    socket.on('receivedMessage', receivedMessage);//escuta menssagens do chat
    socket.on('receivedpong', receivedpong);//escuta sinal para manter conexão ativa
    peer.on('call', reqcall);//escuta chamada p2p para videos
  } catch (error) {
    console.log(error);
    return false;
  }
  return true;
}
//gera id de conexão p2p
function connectopen(id){
  userdata.pid = id;
  //console.log('My peer ID:', id);
}
//lê personagens salvos no localStorage
readSavedCaracters();
function readSavedCaracters(){
  chars = JSON.parse(localStorage.getItem('chars')) || {};
  if (Object.keys(chars).length) {
    savedcaracters.classList.remove('hiddemdiv');
    Object.keys(chars).forEach(key => {
      const btuser = document.createElement('div');
      btuser.classList.add('savedchar');
      btuser.innerHTML = key;
      btuser.title = "Carregar "+key;
      const delbt = document.createElement('button');
      delbt.classList.add('delbt');
      delbt.innerHTML = "X";
      btuser.title = "Remover "+key;
      btuser.appendChild(delbt);
      btuser.addEventListener('click', ()=>{
        caractername.value = key;
        skillD12.value = chars[key].skillD12;
        skillD10.value = chars[key].skillD10;
        skillD8.value = chars[key].skillD8;
        skillD6.value = chars[key].skillD6;
        decriptcaracter.innerHTML = chars[key].decript;
      });
      delbt.addEventListener('click',()=>{
        delete chars[key];
        btuser.remove();
        savelocalstorage();
      });
      savedcaracters.appendChild(btuser);
    });
  }
}
//salva personagem no localStorage
function savecaracter(data){
  chars[data.get("caractername")] = {
    'skillD12': data.get("skillD12"),
    'skillD10': data.get("skillD10"),
    'skillD8': data.get("skillD8"),
    'skillD6': data.get("skillD6"),
    'decript':data.get("decriptcaracter")
  };
  savelocalstorage();
}
function savelocalstorage(){
  localStorage.setItem('chars',JSON.stringify(chars));
}
function typegamedef(){
  switch (userdata.typegame) {
    case "origindice":
      optionaldice.forEach((el)=>{el.classList.add('hiddemdiv')});
      origdice.forEach((el)=>{el.classList.remove('hiddemdiv')});
      onedicebt.classList.add('hiddemdiv');
    break;
    case "simpledice":
      optionaldice.forEach((el)=>{el.classList.add('hiddemdiv')});
      origdice.forEach((el)=>{el.classList.add('hiddemdiv')});
      onedicebt.classList.remove('hiddemdiv');
    break;
    case "fulldice":
    default:
      optionaldice.forEach((el)=>{el.classList.remove('hiddemdiv')});
      origdice.forEach((el)=>{el.classList.remove('hiddemdiv')});
      onedicebt.classList.add('hiddemdiv');
    break;
  }
  //console.log(userdata.typegame);
}
//recebe usuario criado no servidor
function createuser(data){
  data.videoconected = false;//define que o streamer de video está desconectado
  //caso o usuário sejá o proprio jogador atualiza perfil
  if (data.username === userdata.username){
    if (data.typeuser === "narrador") {
      userdata.playnumber = data.playnumber;
      userdata.sid = data.sid;
      userdata.room = data.room;
      skillsnames[1].innerHTML = data.skillD12;
      skillsnames[2].innerHTML = data.skillD10;
      skillsnames[3].innerHTML = data.skillD8;
      skillsnames[4].innerHTML = data.skillD6;
      userdata.status = data.status;
      renderMessage({
        author: "",
        message: `Bem vindo ao jogo Narrador <strong>${data.username}</strong>, convide três jogadores para iniciar sua aventura pelo link <a href="${location.origin + '?narrador=' +userdata.narradorname}" target="_blank">${location.origin + '?narrador=' +userdata.narradorname}</a> .`,
      });
      typegamedef();
    }else if (data.status.narrador && data.status.user && data.status.vaga){
      userdata.playnumber = data.playnumber;
      userdata.sid = data.sid;
      userdata.room = data.room;
      skillsnames[1].innerHTML = data.skillD12;
      skillsnames[2].innerHTML = data.skillD10;
      skillsnames[3].innerHTML = data.skillD8;
      skillsnames[4].innerHTML = data.skillD6;
      userdata.status = true;
      renderMessage({
        author: "",
        message: `Bem vindo ao jogo <strong>${data.username}</strong>.`,
      });
    }else{
      userdata.status = false;
      if(!data.status.narrador){
        renderMessage({author:"",message:`O Narrador <strong>${data.narradorname}</strong> está offline, verifique o nome e a disponibilidade do seu narrador e tente novamente.`});
      }
      if(!data.status.vaga){
        renderMessage({author:"",message:`O Narrador <strong>${data.narradorname}</strong> está com a sala lotada, verifique a disponibilidade do seu narrador e tente novamente.`});
      }
      if(!data.status.user){
        renderMessage({author:"",message:`Na sala do Narrador <strong>${data.narradorname}</strong> já existe um usuário com nome <strong>${data.username}</strong> tente novamente com outro nome de usuário.`});
      }
    }
  }else{
    renderMessage({
      author: "",
      message: `O jogador <strong>${data.username}</strong> entrou com o personagem: <strong>${data.caractername}</strong>.`,
    });
    if (data.typeuser === "narrador"){
      userdata.typegame = data.typegame;
      typegamedef();
    }
  }
  //salva usuario na memória local
  if (userdata.status){
    if (!users[data.username]){
      users[data.username] = data;
      showdatauser(data);
    }
    if (data.username === userdata.username){
      videoinit(data.username);
      pingpong();
    }
  }else{
    setTimeout(()=>{
      modal.classList.remove("hiddemdiv");//mostra o modal do form da pagina
    },3000);
  }
}
//recebe mensagens previas (desativado)
function premessages(premess){
  if (premess.username === userdata.username)
  premess.hist.forEach((el) => {
    renderMessage(el);
  });
};
//formulario modal de login
//mostra/esconde o campos do personagem de acordo com o tipo de usuario (jogador/narrador)
typenarrador.addEventListener("click", () => {
  caracterinfos.classList.add("hiddemdiv");
  narrinfos.classList.remove("hiddemdiv");
  caracterinfosinput.forEach((el)=>{el.required = false});
});
typeplayer.addEventListener("click", () => {
  caracterinfos.classList.remove("hiddemdiv");
  narrinfos.classList.add("hiddemdiv");
  caracterinfosinput.forEach((el)=>{el.required = true});
});
//mostra/esconde o campos de ação facil e dificil de acordo com o tipo de jogo (original/avançado)
typeorigindice.addEventListener("click", () => {
  optionaldice.forEach((el)=>{el.classList.add('hiddemdiv')});
  origdice.forEach((el)=>{el.classList.remove('hiddemdiv')});
  onedicebt.classList.add('hiddemdiv');
});
typesimpledice.addEventListener("click", () => {
  optionaldice.forEach((el)=>{el.classList.add('hiddemdiv')});
  origdice.forEach((el)=>{el.classList.add('hiddemdiv')});
  onedicebt.classList.remove('hiddemdiv');
});
typefulldice.addEventListener("click", () => {
  optionaldice.forEach((el)=>{el.classList.remove('hiddemdiv')});
  origdice.forEach((el)=>{el.classList.remove('hiddemdiv')});
  onedicebt.classList.add('hiddemdiv');
});
//faz leitura de query url se houver
const queryURL = (new URLSearchParams(location.search)).get('narrador');
if (queryURL) {
  typeplayer.click();
  narradorname.value = queryURL;
}
//mostra/esconde tutorial de uso
instruct.addEventListener("click", function () {
  framehelp.classList.toggle("displaynone");
});

//renderiza mensagem no campo de chat
function renderMessage(messag) {
  messages.innerHTML += `<div class="message"><strong>${messag.author}: </strong>${messag.message}</div>`;
  messages.scrollTo({
    top: Array.from(messages.childNodes).reduce(
      (acc, v) => acc + v.clientHeight,
      0
    ),
    behavior: "smooth",
  });
}

//envio de formulario para login
modalform.addEventListener("submit", (ev) => {
  ev.preventDefault();//evita carregamento da pagina
  if (isconnect){
    modal.classList.add("hiddemdiv");//apaga o modal do form da pagina
    let data = new FormData(modalform);//dados do formulario
    const pid = userdata.pid;
    userdata = Object.fromEntries(data);//pega dados dos campos imput
    userdata.pid = pid;
    username.value = data.get("username");//preenche o campo input type=hidden
    if (data.get("typeuser") === "narrador"){//caso o usuario seja um narrador
      userdata.narradorname = userdata.username;
      userdata.caractername = "narrador";
      userdata.skillD12 = "D12";
      userdata.skillD10 = "D10";
      userdata.skillD8 = "D8";
      userdata.skillD6 = "D6";
    }else if (data.get("typeuser") === "jogador"){//caso o usuario seja um jogador
      //console.log('usuario jogador');
    }
    try {
      socket.emit("sendUser", userdata);
      renderMessage({ author: "", message: "<strong>Bem Vindo ao Histórias Incríveis</strong>" });
    } catch (error) {
      console.log(error);
      modal.classList.remove("hiddemdiv");//retorna o modal do form para a pagina
    }
    //salva personagem no localStorage
    if (data.get("caractername") !== ""){
      savecaracter(data);
    }
  }else{
    alert('falha de acesso, verifique sua conexão com internet e recarregue a página');
  }
});

//renderiza tela de usuário
function showdatauser(datauser) {
  const newuser = document.createElement('div');
  newuser.classList.add('showuserdiv');
  if (datauser.typeuser === "narrador"){
    newuser.classList.add('divnarrador');
  }
  newuser.title = `${datauser.decriptcaracter || ""}
  D12: ${datauser.skillD12 || ""}
  D10: ${datauser.skillD10 || ""}
  D8: ${datauser.skillD8 || ""}
  D6: ${datauser.skillD6 || ""}`
  newuser.innerHTML = `<span class="showusername">${datauser.username || ""}</span>
            <label class="caracterinfo ${
              datauser.typeuser === "narrador" ? "hiddemdiv" : ""
            }">
                <strong class="atrr">${datauser.caracteratrib || ""}</strong>
                <span class="caract">${datauser.caractername || ""}</span>
            </label>`;
  users[datauser.username].scr = newuser;
  const videouser = document.createElement('video');
  users[datauser.username].videoscreen = videouser;
  newuser.appendChild(videouser);
  mainusers.appendChild(newuser);
}
//remove usuario que saiu
function removeuser(user){
  users[user].scr.remove();
  renderMessage({ author: "", message: "Usuário <strong>"+user+"</strong> desconectou." });
  delete users[user];
};
//submissão de mensagens do chat
chat.addEventListener("submit", (ev) => {
  ev.preventDefault();
  author = username.value;
  mess = message.value;

  if (author && mess) {
    let messageObject = {
      author: author,
      message: mess,
    };
    //renderMessage(messageObject);
    socket.emit("sendMessage", messageObject);
  }
  message.value = "";
});

function receivedMessage(messag){
  renderMessage(messag);
};

//botões de rolagem de dados
for (let i = 0; i < dicebt.length; i++) {
  let rolldices = {};
  const typesdices = ['d20','d12','d10','d8','d6','d4','d6'];
  rolldices.nroll = 1;
  if (i < typesdices.length) {
    rolldices.dicetype = typesdices[i];
  }
  dicebt[i].addEventListener("click", (ev) => {
    ev.preventDefault();
    //dados para rolagem
    rolldices.user = userdata.username;
    rolldices.room = userdata.narradorname || userdata.username;
    rolldices.minvalue = minvalueteste;
    try {
      socket.emit("rollDice", rolldices);//envia solicitação
      console.log(rolldices);
    } catch (error) {
      console.log(error);
      renderMessage({author:"",message:"Falha ao enviar solicitação de rolagem de dados, tente novamente."});
    }
  });
}

//resultado de rolagem de dados
function roolresult(result){
  //console.log(result);
  renderMessage({ author: result.user, message: `Rolagem ${result.dicetype}: ${result.value} = ${result.result}` });
}

async function addVideoStream (video, stream) {
  let result = false;
  try {
    video.srcObject = stream; //sinal de video associado ao elemento
    await video.addEventListener("loadedmetadata", () => {
      //evento de carregar meta dados
      video.play(); //inicia reprodução
      result = true;
    });
  } catch (error) {
    console.log(error);
    renderMessage({author:'error',message:error});
  }
  return result;
};

async function videoinit(user) {
  await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .then(async (stream) => {
      streams[user] = stream;
      const result = await addVideoStream(users[user].videoscreen, stream);//adciona video local na tela
      if (result) users[user].videoconected = true;
      intervalvideo();
    }).catch(error => {
      console.log(error);
    });
  let ouser;
  Object.keys(users).forEach(el=>{
    if((el !== userdata.username) && !(users[el].videoconected)){
      ouser = el;
    }
  });
  if (ouser) calltouser(ouser);
}

//realiza ligação enviando stream
async function calltouser(user){
  const call = await peer.call(users[user].pid,streams[userdata.username]);
  call.on('stream',async remoteStream => {
    if (!(users[user].videoconected)){
      const result = await addVideoStream(users[user].videoscreen, remoteStream);
      if (result) users[user].videoconected = true;
    }
  });
}

//recebe ligação com stream
function reqcall(call){
  call.answer(streams[userdata.username]);
  call.on('stream', function(stream){
    Object.keys(users).forEach(async el=>{
      if(users[el].pid === call.peer){
        streams[el] = stream;
        const result = await addVideoStream(users[el].videoscreen, streams[el]);
        if (result) users[el].videoconected = true;
      }
    });
  });
};
//reconecta caso conexões p2p tenham caido
let interval;
function intervalvideo(){
  interval = setInterval(() => {
    Object.keys(users).forEach(el => {
      if (!(users[el].videoconected) && (el !== userdata.username)){
        calltouser(users[el].username);
      }
    });
  }, 60000);//a cada minuto verifica se há algum usuário sem conexão de video
  //console.log('verifica a cada minuto:',interval);
}
//evento de liga/desliga audio
mediabt[0].addEventListener("click", () => {
  try {
    const enabled = streams[userdata.username].getAudioTracks()[0].enabled; //propriedade de audio ligado/desligado
    if (enabled) {
      //se audio ligado
      streams[userdata.username].getAudioTracks()[0].enabled = false; //desliga audio
      mediabt[0].classList.add("borderoff"); //altera botão
    } else {
      //se audio desligado
      streams[userdata.username].getAudioTracks()[0].enabled = true; //liga audio
      mediabt[0].classList.remove("borderoff"); //altera botão
    }
  } catch (error) {
    console.log(error);
  }
});
//evento de liga/desliga video
mediabt[1].addEventListener("click", () => {
  try {
    const enabled = streams[userdata.username].getVideoTracks()[0].enabled; //propriedade de audio ligado/desligado
    if (enabled) {
      //se audio ligado
      streams[userdata.username].getVideoTracks()[0].enabled = false; //desliga audio
      mediabt[1].classList.add("borderoff"); //altera botão
    } else {
      //se audio desligado
      streams[userdata.username].getVideoTracks()[0].enabled = true; //liga audio
      mediabt[1].classList.remove("borderoff"); //altera botão
    }
  } catch (error) {
    console.log(error);
  }
});
let intervalpp;
let todesconected = 3;
async function pingpong(){//solicitação vazia para o servidor, apenas para manter conexão ativa
  intervalpp = setInterval(() => {
    if (todesconected === 0){
      renderMessage({ author: "", message: "<strong>Você desconectou.</strong>" });
      clearInterval(intervalpp);
    }else{
      const time = (new Date()).getTime();
      socket.emit("sendping", time);
      todesconected--;
    }
  }, 5000);
}
async function receivedpong(pingtime){
  if (pingtime){
    const time = (new Date()).getTime();
    if (time-pingtime > 500)
      console.log("ping",time-pingtime,"ms");
    todesconected = 3;
    return true;
  }else{
    isconnect = configConections();
    return false;
  }
}

