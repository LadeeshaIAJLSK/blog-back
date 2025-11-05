# Blog Backend API

A complete Node.js/Express backend for the blog platform with MongoDB database.

## Features

- ✅ **Posts Management**: Create, read, update, delete posts (admin only)
- ✅ **Comments System**: Visitors can comment without registration
- ✅ **Like System**: Like posts and comments by IP (no registration needed)
- ✅ **Admin Authentication**: JWT-based auth for admin functions
- ✅ **File Uploads**: Featured image support with multer
- ✅ **Data Validation**: Input validation and sanitization
- ✅ **Rate Limiting**: Protection against spam and abuse
- ✅ **Security**: Helmet, CORS, and other security middlewares

## API Endpoints

### Public Endpoints (No Auth Required)

#### Posts
- `GET /api/posts` - Get all published posts with pagination
- `GET /api/posts/:id` - Get single post by ID or slug
- `POST /api/posts/:id/like` - Like/unlike a post
- `GET /api/posts/:id/like-status` - Check if post is liked
- `POST /api/posts/:id/comments` - Add comment to post
- `GET /api/posts/:id/comments` - Get comments for post
- `GET /api/posts/meta/categories` - Get all categories
- `GET /api/posts/meta/tags` - Get all tags

#### Comments
- `POST /api/comments/:id/like` - Like/unlike a comment
- `GET /api/comments/:id/like-status` - Check comment like status

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Protected Admin Endpoints

#### Admin Posts Management
- `POST /api/admin/posts` - Create new post (with image upload)
- `GET /api/admin/posts` - Get all posts (including drafts)
- `GET /api/admin/posts/:id` - Get single post for editing
- `PUT /api/admin/posts/:id` - Update post
- `DELETE /api/admin/posts/:id` - Delete post

#### Admin Comments Management
- `GET /api/admin/comments` - Get all comments with status filtering
- `PUT /api/admin/comments/:id/status` - Update comment status
- `DELETE /api/admin/comments/:id` - Delete comment

#### Dashboard
- `GET /api/admin/dashboard/stats` - Get dashboard statistics

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

### 1. Install Dependencies
```bash
cd blog-backend
npm install
```

### 2. Environment Configuration
Create `.env` file in the root directory:
```env
MONGODB_URI=mongodb://localhost:27017/blog
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Upload settings
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

### 3. Database Setup

#### Option A: Local MongoDB
1. Install MongoDB on your system
2. Start MongoDB service
3. Use default URI: `mongodb://localhost:27017/blog`

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster and get connection string
3. Update `MONGODB_URI` in `.env`

### 4. Seed Sample Data
```bash
npm run seed
```

This creates:
- Admin user: `admin@blog.com` / `admin123`
- 3 sample blog posts
- Sample comments

### 5. Start the Server

#### Development Mode (with auto-restart)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

Server will run on `http://localhost:5000`

## Project Structure

```
blog-backend/
├── models/           # MongoDB schemas
│   ├── User.js      # User model with authentication
│   ├── Post.js      # Blog post model with likes/comments
│   └── Comment.js   # Comment model with likes
├── routes/          # API route handlers
│   ├── auth.js      # Authentication routes
│   ├── posts.js     # Public post routes
│   ├── comments.js  # Comment routes
│   └── admin.js     # Admin-only routes
├── middleware/      # Express middlewares
│   ├── auth.js      # JWT authentication
│   └── adminAuth.js # Admin role verification
├── scripts/         # Utility scripts
│   └── seedData.js  # Database seeding
├── uploads/         # File storage (auto-created)
├── server.js        # Main application file
└── package.json     # Dependencies and scripts
```

## Testing the API

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Login as Admin
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@blog.com", "password": "admin123"}'
```

### Get All Posts
```bash
curl http://localhost:5000/api/posts
```

### Like a Post
```bash
curl -X POST http://localhost:5000/api/posts/POST_ID/like
```

### Add a Comment
```bash
curl -X POST http://localhost:5000/api/posts/POST_ID/comments \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Great post!",
    "username": "John Doe", 
    "email": "john@example.com"
  }'
```

## Frontend Integration

Update your React app's API base URL in `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

Also add to your React `.env`:
```env
REACT_APP_API_URL=http://localhost:5000
```

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet**: Security headers protection  
- **CORS**: Cross-origin request configuration
- **Input Validation**: express-validator for all inputs
- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: 7-day expiration
- **File Upload Limits**: 5MB max size, image types only

## Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/blog
JWT_SECRET=very-secure-random-string-at-least-32-characters
PORT=5000
FRONTEND_URL=https://yourdomain.com
```

### Docker Support (Optional)
Create `Dockerfile`:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Contributing

1. Ensure MongoDB is running
2. Run `npm run seed` for test data
3. Use `npm run dev` for development
4. Test API endpoints with curl or Postman
5. Check logs for any errors

## License

MIT License