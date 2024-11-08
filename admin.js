import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://tkcrnfgnspvtzwbbvyfv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrY3JuZmduc3B2dHp3YmJ2eWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5ODgwMTgsImV4cCI6MjA0NjU2NDAxOH0.o4kZY3X0XxcpM3OHO3yw7O3of2PPtXdQ4CBFgp3CMO8'
const supabase = createClient(supabaseUrl, supabaseKey)

const loginForm = document.getElementById('loginForm')
const adminPanel = document.getElementById('adminPanel')
const adminMessagesList = document.getElementById('adminMessagesList')
const username = document.getElementById('username')
const password = document.getElementById('password')
const loginButton = document.getElementById('loginButton')
const logoutButton = document.getElementById('logoutButton')

let isAuthenticated = false

async function login() {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('username', username.value)
    .eq('password_hash', 'pbkdf2:sha256:600000$5bpgXBqDEVxL5YAm$b44b62c3e0d39a3fff1d1d3955f43349468ea3655f7682bd95c4e21f6e49a7c3')
    .single()

  if (error || !data) {
    alert('登录失败，请检查用户名和密码')
    return
  }

  isAuthenticated = true
  loginForm.style.display = 'none'
  adminPanel.style.display = 'block'
  loadMessages()
}

function logout() {
  isAuthenticated = false
  loginForm.style.display = 'flex'
  adminPanel.style.display = 'none'
  adminMessagesList.innerHTML = ''
}

async function loadMessages() {
  if (!isAuthenticated) return

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', 1002)
    .is('parent_id', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading messages:', error)
    return
  }

  const { data: replies, error: repliesError } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', 1002)
    .not('parent_id', 'is', null)
    .order('created_at', { ascending: true })

  if (repliesError) {
    console.error('Error loading replies:', repliesError)
    return
  }

  adminMessagesList.innerHTML = ''
  messages.forEach(message => {
    const messageReplies = replies.filter(reply => reply.parent_id === message.id)
    displayMessage(message, messageReplies)
  })
}

function displayMessage(message, replies = []) {
  const messageDiv = document.createElement('div')
  messageDiv.className = 'message-item'
  
  const contentDiv = document.createElement('div')
  contentDiv.className = 'message-content'
  contentDiv.textContent = message.content
  
  const actionsDiv = document.createElement('div')
  actionsDiv.className = 'message-actions'
  
  const replyButton = document.createElement('button')
  replyButton.textContent = '回复'
  replyButton.onclick = () => showReplyForm(message.id, messageDiv)
  
  const deleteButton = document.createElement('button')
  deleteButton.textContent = '删除'
  deleteButton.className = 'delete-button'
  deleteButton.onclick = () => deleteMessage(message.id)
  
  actionsDiv.appendChild(replyButton)
  actionsDiv.appendChild(deleteButton)
  messageDiv.appendChild(contentDiv)
  messageDiv.appendChild(actionsDiv)

  if (replies.length > 0) {
    const repliesDiv = document.createElement('div')
    repliesDiv.className = 'replies'
    replies.forEach(reply => {
      const replyDiv = document.createElement('div')
      replyDiv.className = 'message-item'
      replyDiv.textContent = reply.content
      
      const replyDeleteButton = document.createElement('button')
      replyDeleteButton.textContent = '删除'
      replyDeleteButton.className = 'delete-button'
      replyDeleteButton.onclick = () => deleteMessage(reply.id)
      
      replyDiv.appendChild(replyDeleteButton)
      repliesDiv.appendChild(replyDiv)
    })
    messageDiv.appendChild(repliesDiv)
  }

  adminMessagesList.appendChild(messageDiv)
}

function showReplyForm(parentId, messageDiv) {
  const existingForm = messageDiv.querySelector('.reply-form')
  if (existingForm) {
    existingForm.remove()
    return
  }

  const replyForm = document.createElement('div')
  replyForm.className = 'reply-form'
  
  const input = document.createElement('input')
  input.className = 'reply-input'
  input.placeholder = '写下你的回复...'
  
  const button = document.createElement('button')
  button.textContent = '发送'
  button.onclick = () => sendReply(input.value, parentId, replyForm)
  
  replyForm.appendChild(input)
  replyForm.appendChild(button)
  messageDiv.appendChild(replyForm)
}

async function sendReply(content, parentId, replyForm) {
  if (!content.trim()) return
  
  const { error } = await supabase
    .from('messages')
    .insert([
      {
        content: content.trim(),
        project_id: 1002,
        parent_id: parentId
      }
    ])

  if (error) {
    console.error('Error sending reply:', error)
    return
  }

  replyForm.remove()
  loadMessages()
}

async function deleteMessage(messageId) {
  if (!confirm('确定要删除这条消息吗？')) return

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)

  if (error) {
    console.error('Error deleting message:', error)
    return
  }

  loadMessages()
}

loginButton.addEventListener('click', login)
logoutButton.addEventListener('click', logout)

supabase
  .channel('messages')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'messages',
      filter: 'project_id=eq.1002'
    }, 
    () => {
      if (isAuthenticated) {
        loadMessages()
      }
    }
  )
  .subscribe()