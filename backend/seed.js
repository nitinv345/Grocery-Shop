// ═══════════════════════════════════════════════════════════
//  Glocery Shop — seed.js
//  Run: node seed.js
//  Seeds MongoDB with sample products
// ═══════════════════════════════════════════════════════════

const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI || "mongodb+srv://sunitabhalekar3562_db_user:y7OW1Gj2JMJLpvfd@grocery.qz6hcpf.mongodb.net/sunita?retryWrites=true&w=majority&appName=Grocery");

const Product = mongoose.model("Product", {
  name:     String, price:  Number, mrp:   Number,
  emoji:    String, category: String, quantity: String,
  badge:    String, inStock:  Boolean,
  description: String, brand: String,
});

const products = [
  // Vegetables
  { name:"Fresh Spinach",  price:29,  mrp:39,  emoji:"🥬", category:"Vegetables",   quantity:"250g",   badge:"sale",  inStock:true },
  { name:"Tomatoes",       price:35,  mrp:45,  emoji:"🍅", category:"Vegetables",   quantity:"500g",   badge:null,    inStock:true },
  { name:"Onions",         price:32,  mrp:40,  emoji:"🧅", category:"Vegetables",   quantity:"1kg",    badge:"sale",  inStock:true },
  { name:"Potatoes",       price:45,  mrp:55,  emoji:"🥔", category:"Vegetables",   quantity:"1kg",    badge:null,    inStock:true },
  { name:"Broccoli",       price:65,  mrp:80,  emoji:"🥦", category:"Vegetables",   quantity:"500g",   badge:"new",   inStock:true },
  { name:"Carrot",         price:28,  mrp:35,  emoji:"🥕", category:"Vegetables",   quantity:"500g",   badge:null,    inStock:true },
  // Fruits
  { name:"Bananas",        price:49,  mrp:60,  emoji:"🍌", category:"Fruits",       quantity:"6 pcs",  badge:null,    inStock:true },
  { name:"Red Apples",     price:99,  mrp:130, emoji:"🍎", category:"Fruits",       quantity:"4 pcs",  badge:"sale",  inStock:true },
  { name:"Mangoes",        price:129, mrp:160, emoji:"🥭", category:"Fruits",       quantity:"2 pcs",  badge:"new",   inStock:true },
  { name:"Green Grapes",   price:79,  mrp:95,  emoji:"🍇", category:"Fruits",       quantity:"500g",   badge:"sale",  inStock:true },
  // Dairy & Eggs
  { name:"Full Cream Milk",price:64,  mrp:68,  emoji:"🥛", category:"Dairy & Eggs", quantity:"1L",     badge:null,    inStock:true },
  { name:"Amul Butter",    price:55,  mrp:60,  emoji:"🧈", category:"Dairy & Eggs", quantity:"100g",   badge:null,    inStock:true },
  { name:"Curd",           price:32,  mrp:38,  emoji:"🫙", category:"Dairy & Eggs", quantity:"400g",   badge:"sale",  inStock:true },
  { name:"Farm Eggs",      price:79,  mrp:90,  emoji:"🥚", category:"Dairy & Eggs", quantity:"12 pcs", badge:null,    inStock:true },
  { name:"Paneer",         price:89,  mrp:105, emoji:"🧀", category:"Dairy & Eggs", quantity:"200g",   badge:"sale",  inStock:true },
  // Snacks
  { name:"Lay's Classic",  price:20,  mrp:20,  emoji:"🥔", category:"Snacks",       quantity:"26g",    badge:null,    inStock:true },
  { name:"Dark Chocolate", price:150, mrp:175, emoji:"🍫", category:"Snacks",       quantity:"100g",   badge:"sale",  inStock:true },
  { name:"Mixed Nuts",     price:199, mrp:250, emoji:"🥜", category:"Snacks",       quantity:"200g",   badge:"offer", inStock:true },
  // Beverages
  { name:"Orange Juice",   price:89,  mrp:110, emoji:"🍊", category:"Beverages",    quantity:"1L",     badge:"sale",  inStock:true },
  { name:"Green Tea",      price:120, mrp:145, emoji:"🍵", category:"Beverages",    quantity:"25 bags",badge:null,    inStock:true },
  // Bakery
  { name:"Multigrain Bread",price:45, mrp:52,  emoji:"🍞", category:"Bakery",       quantity:"400g",   badge:null,    inStock:true },
  { name:"Butter Croissant",price:55, mrp:65,  emoji:"🥐", category:"Bakery",       quantity:"2 pcs",  badge:"new",   inStock:true },
  // Household
  { name:"Dish Soap",      price:55,  mrp:65,  emoji:"🧴", category:"Household",    quantity:"500ml",  badge:"sale",  inStock:true },
  { name:"Toilet Paper",   price:149, mrp:180, emoji:"🧻", category:"Household",    quantity:"6 rolls",badge:null,    inStock:true },
  // Organic
  { name:"Organic Honey",  price:279, mrp:320, emoji:"🍯", category:"Organic",      quantity:"500g",   badge:"new",   inStock:true },
  { name:"Quinoa",         price:249, mrp:290, emoji:"🌾", category:"Organic",      quantity:"500g",   badge:null,    inStock:true },
];

async function seed() {
  try {
    await Product.deleteMany({});
    const inserted = await Product.insertMany(products);
    console.log(`✅ Seeded ${inserted.length} products`);
  } catch (e) {
    console.error("❌ Seed error:", e);
  } finally {
    mongoose.connection.close();
  }
}

seed();
