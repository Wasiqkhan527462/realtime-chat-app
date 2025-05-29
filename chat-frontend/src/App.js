import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Container, Paper, TextField, Button, Box, Typography, List, ListItem,
  AppBar, Toolbar, Divider, Dialog, DialogTitle, ListItemButton,
  DialogContent, DialogActions, IconButton, Tab, Tabs
} from '@mui/material';

function App() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [room, setRoom] = useState('');
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  // const [errorMessage, setErrorMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (isLoggedIn && token) {
      const newSocket = io('http://localhost:5000', {
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('Connected to socket server');
        setSocket(newSocket);
        newSocket.emit('getUsers');
        newSocket.emit('getRooms');
        newSocket.emit('getGroups');
      });

      newSocket.on('roomMessages', (msgs) => {
        setMessages(msgs);
      });

      newSocket.on('newMessage', (msg) => {
        setMessages(prev => [...prev, msg]);
      });

      newSocket.on('userList', (userList) => {
        setUsers(userList);
      });

      setRoom(''); // Reset room if group features are removed
      newSocket.on('groupList', (groupList) => {
        setGroups(groupList);
      });

      newSocket.on('newGroup', (group) => {
        setGroups(prev => [...prev, group]);
      });

      newSocket.on('groupUpdated', (updatedGroup) => {
        setGroups(prev => prev.map(g => g._id === updatedGroup._id ? updatedGroup : g));
      });

      newSocket.on('leftGroup', (groupId) => {
        setGroups(prev => prev.filter(g => g._id !== groupId));
        if (room === groupId) {
          setRoom('');
          setMessages([]);
        }
      });

      return () => newSocket.close();
    }
  }, [isLoggedIn, token]);

  useEffect(() => {
    // Check for saved token first
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
    }

    // Only proceed with socket connection if we have a token and are logged in
    if (!savedToken) return;

    const newSocket = io('http://localhost:5000', {
      auth: { token: savedToken }
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      setSocket(newSocket);
      // Request initial data
      newSocket.emit('getUsers');
      newSocket.emit('getRooms');
      newSocket.emit('getGroups');
    });

    // Group-related event handlers
    newSocket.on('groupList', (groupList) => {
      console.log('Received group list:', groupList);
      setGroups(groupList);
    });

    newSocket.on('leftGroup', (groupId) => {
      setGroups(prev => prev.filter(g => g._id !== groupId));
      if (room === groupId) {
        setRoom('');
        setMessages([]);
      }
    });

    // Message-related event handlers
    newSocket.on('roomMessages', (msgs) => {
      setMessages(msgs);
    });

    newSocket.on('newMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('userList', (userList) => {
      setUsers(userList);
    });

    return () => {
      if (newSocket) {
        newSocket.disconnect();
        newSocket.close();
      }
    };
  }, []); // Empty dependency array since this should only run once on mount

  useEffect(() => {
    if (isLoggedIn && socket) {
      socket.on('groupList', (groupList) => {
        setGroups(groupList);
        console.log('Groups List:', groupList);
      });

      socket.on('roomMessages', (messages) => {
        setMessages(messages);
      });
    }
  }, [isLoggedIn, socket]); // Run this effect if either `isLoggedIn` or `socket` changes

  // Login, logout, message sending, etc.
  const login = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password })
      });
      const data = await response.json();
  
      if (data.token && data._id) { // Check if user data is present
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setCurrentUser({
          _id: data._id,
          username: data.username,
          email: data.email,
          role: data.role,
          organizationId: data.organizationId
        });
        setIsLoggedIn(true);
      } else {
        console.error('Invalid login response', data);
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  const logout = () => {
    if (socket) {
      socket.disconnect();
    }
    localStorage.removeItem('token');
    setSocket(null);
    setToken('');
    setIsLoggedIn(false);
    setMessages([]);
    setUsername('');
    setPassword('');
    setRoom('');
    setUsers([]);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket && room) {
      socket.emit('sendMessage', { roomId: room, content: message });
      setMessage('');
    }
  };

  const joinRoom = (roomId) => {
    if (socket && roomId) {
      socket.emit('joinRoom', roomId);
      setRoom(roomId);
    }
  };

  const startPrivateChat = (userId) => {
    if (socket && userId) {
      socket.emit('getPrivateRoom', { userId });
      setSelectedUser(userId);
    }
  };

  useEffect(() => {
    if (socket) {
      socket.on('privateRoom', (privateRoom) => {
        setMessages([]);
        setRoom(privateRoom._id);
        joinRoom(privateRoom._id);
      });

      return () => socket.off('privateRoom');
    }
  }, [socket]);

  if (!isLoggedIn) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>Login</Typography>
            <TextField
              fullWidth
              label="Email"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 2 }}
              onClick={login}
            >
              Login
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  const createGroup = () => {
    if (socket && newGroupName && selectedUsers.length > 0) {
      const participants = currentUser?.role === 'admin'? selectedUsers: [...selectedUsers, currentUser._id];
      socket.emit('createGroup', {
        name: newGroupName,
        participants
      });
  
      setCreateGroupOpen(false);
      setNewGroupName('');
      setSelectedUsers([]);
    }
  };
  
  const leaveGroup = (groupId, event) => {
    event.stopPropagation();
    if (socket && groupId) {
      socket.emit('leaveGroup', { groupId });
      // Reset UI state
      setRoom('');
      setMessages([]);
      setSelectedTab(0); // Switch back to Users tab
      setSelectedUser(null);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Modify the return statement to include group chat UI
  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6">Chat App</Typography>
          <Button color="inherit" onClick={logout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex' }}>
        {/* Sidebar with tabs */}
        <Paper sx={{ width: 240, height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
            <Tab label="Users" />
            <Tab label="Groups" />
          </Tabs>
          
          {selectedTab === 0 ? (
            <List>
              {users.map((user) => (
                <ListItem 
                  key={user._id} 
                  button 
                  onClick={() => startPrivateChat(user._id)}
                  selected={selectedUser === user._id}
                >
                  <Typography>{user.username}</Typography>
                </ListItem>
              ))}
            </List>
          ) : (
            <>
              <Button
                fullWidth
                variant="contained"
                sx={{ m: 2 }}
                onClick={() => setCreateGroupOpen(true)}
              >
                Create Group
              </Button>
              <List>
                {groups.map((group) => (
                  <ListItem 
                    key={group._id} 
                    button 
                    onClick={() => joinRoom(group._id)}
                    selected={room === group._id}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Typography>{group.name}</Typography>
                      <Button
                        size="small"
                        color="error"
                        onClick={(e) => leaveGroup(group._id, e)}
                      >
                        Leave
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Paper>

        {/* Chat area */}
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <Paper sx={{ height: 'calc(100vh - 100px)' }}>
            <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5" gutterBottom>
                {room ? 
                  `Chat Room: ${selectedTab === 1 ? 
                    groups.find(g => g._id === room)?.name : 
                    users.find(u => u._id === selectedUser)?.username}` : 
                  'Select a chat to start messaging'}
                </Typography>
              
              <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                {messages.map((msg, index) => (
                  <ListItem key={index}>
                    <Typography>
                      <strong>{msg.sender.username}:</strong> {msg.content}
                    </Typography>
                  </ListItem>
                ))}
              </List>

              {room && (
                <Box component="form" onSubmit={sendMessage} sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message"
                    margin="normal"
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    type="submit"
                    sx={{ mt: 1 }}
                  >
                    Send
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Create Group Dialog */}
      <Dialog open={createGroupOpen} onClose={() => setCreateGroupOpen(false)}>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Group Name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            margin="normal"
          />
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Select Users:</Typography>
          <List sx={{ maxHeight: 200, overflow: 'auto' }}>
            {users.map((user) => (
              <ListItem
                key={user._id}
                disablePadding
              >
                <ListItemButton
                  onClick={() => toggleUserSelection(user._id)}
                  selected={selectedUsers.includes(user._id)}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: '#2196f3 !important',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#1976d2 !important'
                      }
                    }
                  }}
                >
                  <Typography>{user.username}</Typography>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateGroupOpen(false)}>Cancel</Button>
          <Button
            onClick={createGroup}
            variant="contained"
            disabled={!newGroupName || selectedUsers.length === 0 || !currentUser}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default App;
