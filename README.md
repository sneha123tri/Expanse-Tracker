# Expensy Backend API

A RESTful API backend for the Expensy expense tracking application built with Node.js, Express.js, and MongoDB.

## Features

- User authentication with JWT tokens
- Secure password hashing with bcrypt
- CRUD operations for transactions
- Budget management
- Analytics and reporting
- Data validation and error handling
- MongoDB with Mongoose ODM

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- MongoDB Compass (for database visualization)

## Installation

1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the MongoDB connection string
   - Set a secure JWT secret

4. Start MongoDB service (if using local installation)

5. Run the application:
   \`\`\`bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   \`\`\`

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

### Transactions
- `GET /api/transactions` - Get all user transactions
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Budget
- `GET /api/budget` - Get user budget
- `POST /api/budget` - Set/update budget

### Analytics
- `GET /api/analytics/summary` - Get financial summary and analytics

## Database Schema

### Users Collection
\`\`\`javascript
{
  fullName: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}
\`\`\`

### Transactions Collection
\`\`\`javascript
{
  userId: ObjectId,
  type: String ('income' | 'expense'),
  description: String,
  category: String,
  amount: Number,
  createdAt: Date,
  updatedAt: Date
}
\`\`\`

### Budgets Collection
\`\`\`javascript
{
  userId: ObjectId (unique),
  amount: Number,
  createdAt: Date,
  updatedAt: Date
}
\`\`\`

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- CORS protection
- Rate limiting (recommended for production)

## Development

The API uses the following middleware:
- `express.json()` - Parse JSON requests
- `cors()` - Enable cross-origin requests
- Custom authentication middleware for protected routes

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a secure JWT secret
3. Configure MongoDB Atlas or secure MongoDB instance
4. Enable HTTPS
5. Add rate limiting and additional security headers
6. Set up logging and monitoring

## Testing

Use tools like Postman or curl to test the API endpoints:

\`\`\`bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
\`\`\`

## Frontend Integration

Update your frontend JavaScript to make API calls instead of using localStorage:

\`\`\`javascript
// Example: Login function
async function handleLogin(email, password) {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed. Please try again.');
  }
}
