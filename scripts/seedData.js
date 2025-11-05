const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
require('dotenv').config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blog');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = new User({
      username: 'admin',
      email: 'admin@blog.com',
      password: 'admin123',
      role: 'admin',
      bio: 'Blog administrator and main author'
    });
    await admin.save();
    console.log('Created admin user');

    // Create sample posts
    const samplePosts = [
      {
        title: 'Welcome to Our Blog',
        slug: 'welcome-to-our-blog',
        content: `
          <h2>Hello and welcome!</h2>
          <p>This is the first post on our new blog platform. We're excited to share our thoughts, ideas, and experiences with you.</p>
          <p>This blog supports:</p>
          <ul>
            <li>Rich text content with HTML</li>
            <li>Comments from visitors (no registration required)</li>
            <li>Like functionality</li>
            <li>Categories and tags</li>
            <li>Featured images</li>
          </ul>
          <p>Feel free to explore and interact with our content!</p>
        `,
        excerpt: 'Welcome to our new blog platform! Discover what we have to offer.',
        category: 'General',
        tags: ['welcome', 'introduction', 'blog'],
        author: admin._id,
        status: 'published'
      },
      {
        title: 'Getting Started with Web Development',
        slug: 'getting-started-with-web-development',
        content: `
          <h2>Your Journey into Web Development</h2>
          <p>Web development is an exciting field that combines creativity with technical skills. Whether you're just starting out or looking to expand your knowledge, this guide will help you understand the fundamentals.</p>
          
          <h3>Front-End Technologies</h3>
          <p>The front-end is what users see and interact with:</p>
          <ul>
            <li><strong>HTML:</strong> The structure of web pages</li>
            <li><strong>CSS:</strong> Styling and layout</li>
            <li><strong>JavaScript:</strong> Interactive functionality</li>
            <li><strong>React:</strong> Popular JavaScript library for building user interfaces</li>
          </ul>
          
          <h3>Back-End Technologies</h3>
          <p>The back-end handles server-side logic:</p>
          <ul>
            <li><strong>Node.js:</strong> JavaScript runtime for server-side development</li>
            <li><strong>Express.js:</strong> Web application framework for Node.js</li>
            <li><strong>MongoDB:</strong> NoSQL database for storing data</li>
          </ul>
          
          <p>Start with the basics and gradually build up your skills. Practice is key to becoming a proficient developer!</p>
        `,
        excerpt: 'A comprehensive guide to getting started with web development, covering both front-end and back-end technologies.',
        category: 'Technology',
        tags: ['web development', 'programming', 'tutorial', 'beginner'],
        author: admin._id,
        status: 'published'
      },
      {
        title: 'Building Interactive User Interfaces',
        slug: 'building-interactive-user-interfaces',
        content: `
          <h2>Creating Engaging User Experiences</h2>
          <p>User interface design is crucial for creating applications that people love to use. In this post, we'll explore best practices for building interactive and intuitive interfaces.</p>
          
          <h3>Key Principles</h3>
          <ol>
            <li><strong>Simplicity:</strong> Keep interfaces clean and uncluttered</li>
            <li><strong>Consistency:</strong> Use consistent design patterns throughout</li>
            <li><strong>Feedback:</strong> Provide clear feedback for user actions</li>
            <li><strong>Accessibility:</strong> Ensure your interface works for everyone</li>
          </ol>
          
          <h3>Modern Tools and Frameworks</h3>
          <p>Today's developers have access to powerful tools:</p>
          <ul>
            <li>React for component-based development</li>
            <li>Bootstrap for responsive design</li>
            <li>CSS Grid and Flexbox for layouts</li>
            <li>Animation libraries for smooth transitions</li>
          </ul>
          
          <p>Remember, the best interface is one that users don't have to think about!</p>
        `,
        excerpt: 'Learn the principles and tools for creating engaging, interactive user interfaces that users will love.',
        category: 'Design',
        tags: ['UI', 'UX', 'design', 'interface', 'user experience'],
        author: admin._id,
        status: 'published'
      }
    ];

    const createdPosts = await Post.insertMany(samplePosts);
    console.log('Created sample posts');

    // Create sample comments
    const sampleComments = [
      {
        post: createdPosts[0]._id,
        text: 'Great start! Looking forward to more content.',
        username: 'John Doe',
        email: 'john@example.com',
        status: 'approved'
      },
      {
        post: createdPosts[0]._id,
        text: 'Love the clean design and functionality!',
        username: 'Jane Smith',
        email: 'jane@example.com',
        status: 'approved'
      },
      {
        post: createdPosts[1]._id,
        text: 'This is exactly what I needed as a beginner. Thank you!',
        username: 'Alex Wilson',
        email: 'alex@example.com',
        status: 'approved'
      },
      {
        post: createdPosts[1]._id,
        text: 'Could you do a follow-up post on advanced topics?',
        username: 'Sarah Johnson',
        email: 'sarah@example.com',
        status: 'approved'
      },
      {
        post: createdPosts[2]._id,
        text: 'These UI principles are spot on! Implementing them in my current project.',
        username: 'Mike Chen',
        email: 'mike@example.com',
        status: 'approved'
      }
    ];

    await Comment.insertMany(sampleComments);
    console.log('Created sample comments');

    // Update post comment counts
    for (const post of createdPosts) {
      const commentCount = await Comment.countDocuments({ post: post._id, status: 'approved' });
      await Post.findByIdAndUpdate(post._id, { commentsCount: commentCount });
    }

    console.log('Updated post comment counts');
    console.log('Seed data created successfully!');
    console.log('\nLogin credentials:');
    console.log('Email: admin@blog.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();