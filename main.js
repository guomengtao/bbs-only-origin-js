import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import './style.css'

const supabaseUrl = 'https://tkcrnfgnspvtzwbbvyfv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrY3JuZmduc3B2dHp3YmJ2eWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5ODgwMTgsImV4cCI6MjA0NjU2NDAxOH0.o4kZY3X0XxcpM3OHO3yw7O3of2PPtXdQ4CBFgp3CMO8'
const supabase = createClient(supabaseUrl, supabaseKey)

const messageInput = document.getElementById('messageInput')
const sendButton = document.getElementById('sendButton')
const messagesList = document.getElementById('messagesList')

async function loadMessages() {
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

  messagesList.innerHTML = ''
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
  
  actionsDiv.appendChild(replyButton)
  messageDiv.appendChild(contentDiv)
  messageDiv.appendChild(actionsDiv)

  if (replies.length > 0) {
    const repliesDiv = document.createElement('div')
    repliesDiv.className = 'replies'
    replies.forEach(reply => {
      const replyDiv = document.createElement('div')
      replyDiv.className = 'message-item'
      replyDiv.textContent = reply.content
      repliesDiv.appendChild(replyDiv)
    })
    messageDiv.appendChild(repliesDiv)
  }

  messagesList.appendChild(messageDiv)
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

async function sendMessage() {
  const content = messageInput.value.trim()
  if (!content) return

  const { error } = await supabase
    .from('messages')
    .insert([
      {
        content,
        project_id: 1002
      }
    ])

  if (error) {
    console.error('Error sending message:', error)
    return
  }

  messageInput.value = ''
  loadMessages()
}

sendButton.addEventListener('click', sendMessage)
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage()
  }
})

loadMessages()

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
      loadMessages()
    }
  )
  .subscribe()