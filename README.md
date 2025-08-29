# Gemini AI Chatbot API

A modern chatbot API built with Node.js and Express, leveraging Google's Gemini AI for intelligent conversations.

## Features

- Text-based conversations with Gemini AI
- Image, audio, and document analysis
- Chat history management with sessions
- Clean, modular codebase architecture

## Tech Stack

- **Backend**: Node.js, Express
- **AI**: Google Gemini API (2.5-flash model)
- **File Processing**: Multer for handling multipart/form-data

## Project Structure

```
├── public/                # Frontend static files
│   ├── index.html         # Main HTML page
│   ├── style.css          # CSS styles 
│   └── script.js          # Frontend JavaScript
├── src/                   # Backend source code
│   ├── controllers/       # API endpoint handlers
│   │   ├── chatController.js
│   │   └── historyController.js
│   ├── middlewares/       # Express middlewares
│   │   ├── errorHandler.js
│   │   └── notFoundHandler.js
│   ├── routes/            # API route definitions
│   │   ├── chatRoutes.js
│   │   └── historyRoutes.js
│   ├── services/          # Business logic services
│   │   └── chatHistoryService.js
│   └── utils/             # Utility functions
│       └── geminiHelper.js
├── index.js               # Application entry point
└── .env                   # Environment variables
```

## Getting Started

### Prerequisites

- Node.js (v14+)
- Google Gemini API key

### Installation

1. Clone the repository
   ```
   git clone https://github.com/RezaR2P/gemini-chatbot-api.git
   cd gemini-chatbot-api
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the project root with your API key
   ```
   GEMINI_API_KEY=your_api_key_here
   PORT=3000
   ```

4. Start the server
   ```
   npm start
   ```

5. Open your browser to `http://localhost:3000`

## API Endpoints

### Chat

- `POST /api/chat/chat` - Send text message to Gemini AI
- `POST /api/chat/generate-from-image` - Send image + text to Gemini AI
- `POST /api/chat/generate-from-audio` - Send audio + text to Gemini AI
- `POST /api/chat/generate-from-document` - Send document for analysis
- `POST /api/chat/generate-text` - Simple text generation

### History

- `GET /api/chat-history` - Get all chat sessions
- `GET /api/chat-history/:sessionId` - Get specific chat session
- `POST /api/chat-history/:sessionId` - Add message to chat session
- `PUT /api/chat-history/:sessionId` - Update session title
- `DELETE /api/chat-history/:sessionId` - Delete chat session

## Development

Run the server in development mode with automatic restart:
```
npm run dev
```

## License

ISC License