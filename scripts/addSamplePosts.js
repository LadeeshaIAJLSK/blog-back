const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
require('dotenv').config();

const samplePosts = [
  {
    title: "The Future of Web Development",
    content: `
      <h2>Introduction</h2>
      <p>Web development is constantly evolving with new technologies, frameworks, and methodologies. In this post, we'll explore the exciting trends shaping the future of web development.</p>
      
      <h2>Modern Frameworks</h2>
      <p>React, Vue, and Angular continue to dominate the frontend landscape, while new players like Svelte and SolidJS are gaining traction with their innovative approaches to reactivity and performance.</p>
      
      <h2>The Rise of Full-Stack Solutions</h2>
      <p>Next.js, Nuxt.js, and other meta-frameworks are blurring the lines between frontend and backend development, offering seamless full-stack solutions.</p>
      
      <h2>Performance and User Experience</h2>
      <p>Core Web Vitals, Progressive Web Apps, and edge computing are revolutionizing how we think about web performance and user experience.</p>
      
      <h2>Conclusion</h2>
      <p>The future of web development is bright, with exciting technologies that promise to make the web faster, more accessible, and more user-friendly than ever before.</p>
    `,
    excerpt: "Explore the exciting trends and technologies shaping the future of web development, from modern frameworks to performance optimization.",
    category: "Technology",
    tags: ["web development", "javascript", "react", "performance", "future trends"],
    featuredImage: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=400&fit=crop&crop=entropy&auto=format",
    slug: "future-of-web-development"
  },
  {
    title: "Building Responsive Designs in 2024",
    content: `
      <h2>The Evolution of Responsive Design</h2>
      <p>Responsive web design has come a long way since its inception. Today's approaches go beyond simple breakpoints to create truly adaptive experiences.</p>
      
      <h2>CSS Grid and Flexbox Mastery</h2>
      <p>Modern CSS layout systems like Grid and Flexbox have revolutionized how we create responsive layouts, offering more control and flexibility than ever before.</p>
      
      <h2>Container Queries: The Game Changer</h2>
      <p>Container queries are finally here, allowing components to respond to their container size rather than just the viewport. This opens up new possibilities for truly modular design systems.</p>
      
      <h2>Mobile-First Strategy</h2>
      <p>Starting with mobile constraints forces us to focus on what's truly important, leading to cleaner, more performant designs across all devices.</p>
      
      <h2>Testing Across Devices</h2>
      <p>With the proliferation of device sizes and capabilities, thorough testing across real devices remains crucial for delivering consistent experiences.</p>
    `,
    excerpt: "Learn modern techniques for creating responsive web designs that work beautifully across all devices and screen sizes.",
    category: "Design",
    tags: ["responsive design", "css", "mobile-first", "grid", "flexbox"],
    featuredImage: "https://images.unsplash.com/photo-1545670723-196ed0954986?w=800&h=400&fit=crop&crop=entropy&auto=format",
    slug: "responsive-designs-2024"
  },
  {
    title: "JavaScript Performance Optimization Tips",
    content: `
      <h2>Understanding JavaScript Performance</h2>
      <p>JavaScript performance can make or break user experience. Understanding how the JavaScript engine works is crucial for writing efficient code.</p>
      
      <h2>Memory Management</h2>
      <p>Proper memory management prevents memory leaks and reduces garbage collection overhead. Learn about object lifecycle and cleanup strategies.</p>
      
      <h2>Optimizing Loops and Algorithms</h2>
      <p>Choose the right data structures and algorithms for your use case. Sometimes a simple optimization can yield dramatic performance improvements.</p>
      
      <h2>Asynchronous Programming Best Practices</h2>
      <p>Master async/await, Promises, and event-driven programming to create responsive applications that don't block the main thread.</p>
      
      <h2>Bundle Optimization</h2>
      <p>Code splitting, tree shaking, and lazy loading can significantly reduce initial bundle sizes and improve application startup time.</p>
      
      <h2>Profiling and Debugging</h2>
      <p>Use browser developer tools effectively to identify performance bottlenecks and optimize your code where it matters most.</p>
    `,
    excerpt: "Discover practical techniques for optimizing JavaScript performance, from memory management to bundle optimization.",
    category: "Programming",
    tags: ["javascript", "performance", "optimization", "async", "debugging"],
    featuredImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop&crop=entropy&auto=format",
    slug: "javascript-performance-optimization"
  }
];

async function addSamplePosts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blog');
    console.log('Connected to MongoDB');

    // Find or create a user to be the author
    let author = await User.findOne({ role: 'admin' });
    if (!author) {
      // Create a default admin user if none exists
      author = new User({
        username: 'admin',
        email: 'admin@blog.com',
        password: 'hashedpassword', // This would normally be properly hashed
        role: 'admin'
      });
      await author.save();
      console.log('Created admin user');
    }

    // Clear existing posts
    await Post.deleteMany({});
    console.log('Cleared existing posts');

    // Add sample posts
    for (const postData of samplePosts) {
      const post = new Post({
        ...postData,
        author: author._id,
        status: 'published'
      });
      await post.save();
      console.log(`Added post: ${post.title}`);
    }

    console.log(`Successfully added ${samplePosts.length} sample posts with images!`);
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample posts:', error);
    process.exit(1);
  }
}

addSamplePosts();