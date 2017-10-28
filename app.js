var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

server.listen(8080);

app.get('/',function(req,res){
    res.sendFile(__dirname +"/index.html");
});

var usernames = {};
var prev_data = {};
var rooms = [];
var grpcount = {} ;
var userlist = {} ;

//for removing a value in the list
function removeA(arr) {
            var what, a = arguments, L = a.length, ax;
            while (L > 1 && arr.length) {
                what = a[--L];
                while ((ax= arr.indexOf(what)) !== -1) {
                        arr.splice(ax, 1);
                }
            }
            return arr;
}

io.sockets.on('connection', function(socket){

    // when the client emits 'adduser', this listens and executes
    socket.on('adduser', function(username,group){
        // store the username in the socket session for this client
        socket.username = username;
        // store the room name in the socket session for this client
        if(rooms.indexOf(group)<=-1)
        {
           rooms.push(group);
        }       
        socket.room = group ;
        if(!(group in grpcount))
        {
           grpcount[group]=1;
        }
        else
        {
           grpcount[group]+=1;
        }
        if(!userlist[group]) userlist[group]=[username];
        else userlist[group].push(username);    
        // add the client's username to the global list
        usernames[username] = username;
        // send client to room 1
        socket.join(group);
        // echo to client they've connected
        socket.emit('updatechat', 'SERVER', 'you have connected to : '+ group);
        // tell your room-mates that a person has connected to their room
        socket.broadcast.to(group).emit('newuser', username);
        socket.emit('present_users',userlist[group]);
        if(group in prev_data)
        {
            socket.emit('updated_para',prev_data[group]);
        }
    });

    // when the client emits 'sendchat', this listens and executes
    socket.on('sendchat', function (data) {
        // we tell the client to execute 'updatechat' with 2 parameters
        io.sockets.in(socket.room).emit('updatechat', socket.username, data);
    });

    //new para needs to sent to room members
    socket.on('para',function(data){
        prev_data[socket.room] = data;
        //console.log(socket.room);  
        //console.log(data);  
        io.sockets.in(socket.room).emit('updated_para',data);
    });

    /*
    socket.on('editing',function(user){
        io.sockets.in(socket.room).emit('update_editstatus',user);
    });

    socket.on('texting',function(user){
        io.sockets.in(socket.room).emit('update_typestatus',user);
    });
    */    

    // when the user disconnects.. perform this
    socket.on('disconnect', function(){
        // remove the username from global usernames list
        delete usernames[socket.username];

        // update list of users in chat, client-side
        io.sockets.emit('updateusers', socket.username);
        // echo globally that this client has left
        socket.broadcast.to(socket.room).emit('updateusers', socket.username);
        grpcount[socket.room]-=1;               
        socket.leave(socket.room);
    });
});
