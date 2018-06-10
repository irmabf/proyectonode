const mongoose = require('mongoose');
const Product = mongoose.model('Product');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');
const knox = require('knox');

//Setup multer options
const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next){
    const isPhoto = file.mimetype.startsWith('image/');
    if(isPhoto){
      next(null, true);
    }else {
      next({ message: 'That filetype isn\'t allowed'}, false);
    }
  }
};

//Setup a knox client

const knoxClient = knox.createClient({
  key: process.env.S3AccessKey,
  secret: process.env.S3Secret,
  bucket: process.env.S3Bucket
});

exports.homePage = (req, res) => {
  console.log(req.name);
  res.render('index');
};

exports.addProduct = (req, res) => {
  res.render('editProduct', {title: 'Add Product'});
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  //check if there is no new file to resize
  if (!req.file){
    next(); //skip to the next middleware
    return;
  }
  //console.log(req.file);
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  //now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  //
  await photo.write(`./public/uploads/${req.body.photo}`);
  //once we have written the photo to our filesystem, keep going
  next();
};

exports.createProduct = async (req, res) => {
  //res.json(req.body);
  req.body.seller = req.user._id;
  const product = await (new Product(req.body)).save();
  req.flash('success', `Successfully Added ${product.name}`);
  res.redirect(`/product/${product.slug}`);
};

exports.getProducts = async (req, res) => {
  //1. Query the database for the articles.
  const products = await Product.find();
  res.render('products', { title: 'Articles', products });
};

const confirmOwner = (product, user) => {
  if (!product.seller.equals(user.id)){
    throw Error('You must be the seller in order to edit the product');
  }
};

exports.editProduct = async (req, res) => {
  //1. Find the product given the id
  const product = await Product.findOne({ _id: req.params.id });
  //2. Confirm the user is the seller
  confirmOwner(product, req.user);
  //3. Render out the edit form so the user can update their product
  res.render('editProduct', { title: `Edit ${product.name}`, product });
};

exports.deleteProduct = async (req, res) => {
  //1. Find the product given the id
  const product = await Product.findOne({ _id: req.params.id });
  //2. Confirm the user is the seller
  confirmOwner(product, req.user);
  //3. Render out the edit form so the user can update their product
  res.render('deleteProduct', { title: `Delete ${product.name}`, product });

  /*try {
    db.orders.deleteOne( { "_id" : ObjectId("563237a41a4d68582c2509da") } );
 } catch (e) {
    print(e);
 }*/
 //await Product.deleteOne({ _id: req.params.id})
};

exports.updateProduct = async (req, res) => {
  //set the location data to be a point
  req.body.location.type = 'Point';
  //1. Find and update the product
  const product = await Product.findOneAndUpdate({ _id: req.params.id}, req.body, {
    new: true, //return the new product instead of the old one
    runValidators: true
  }).exec();
  req.flash('success', `Succesfully updated <strong>${product.name}</strong>. <a href="/products/${product.slug}">View article →</a>`);
  res.redirect(`/products/${product._id}/edit`);
  //2. Redirect to the product and tell the user it worked
};

exports.deleteProductYes = async (req, res) => {

  //1. Find and update the product

  await Product.findByIdAndRemove(req.params.id, function(err) {
    if (err)
        res.send(err);
    else
        //res.json({ message: 'Offer Deleted!'});
        res.redirect(`/products`);
});
  //2. Redirect to the product and tell the user it worked
};

exports.getProductBySlug = async (req, res) => {
  //res.json(req.params);
  const product = await Product.findOne({ slug: req.params.slug });
  //res.json(product)
  if(!product) return next();
  res.render('product', { product, title: product.name });
};

exports.getProductsByTag = async (req, res) => {
  //Get the tag selected by the user
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };
  //Find the list of tags of one specific product
  const tagsPromise = Product.getTagsList();
  //Find the Products where the tags list includes a specific tag
  const productsPromise = Product.find({ tags: tagQuery })
  //Now we have two promises: tagsPromise and productPromise, they way whe await for
  //multiple promises that come back is using promiseAll
  //const result =  await Promise.all([ tagsPromise, productsPromise]);
  //Use object destructuring
  const [tags, products] =  await Promise.all([ tagsPromise, productsPromise]);
  //res.json(tags);
  //res.json(products);
  res.render('tag', { tags, title: 'Tags', tag, products })
};

exports.searchProducts = async (req, res) => {
  const products = await Product
  .find({
      $text: {
        $search: req.query.q
      }
    }, {
      score: { $meta: 'textScore' }
    })
  .sort({
      score: { $meta: 'textScore'}
    });
    //limit results to 10
  //.limit(20);
  res.json(products);
};

exports.mapProducts = async (req, res) => {
  //res.json({ it: 'Works'});
  //We hit this enpoint with two queries, the lat and the long
  //The way that mongodb expects us to pass the coordinates to it is
  //as an array of long and lat numbers
  //this down below gives as an array of strings, but we need an array of numbers
  // const coordinates = [req.query.lng, req.query.lat];
  //So, for getting an array of numbers, we map over it an pass it to parseFloat
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  // res.json(coordinates);
  //Next, we wanna make our query so that when we do product.find we are gonna
  //to be able to pass it
  //It´s gonna be a big query, so we need to be able to write it in a separate object
  //and pass it in
  const q = {
    //We search search for products where the location property is $near
    /**$near is an operator in mongodb and it will allow us to just search for
     * products that are near a certain lat and long
     */
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        // $maxDistance: 10000 //10 thousand metters -> 10KM
      }
    }
  }
  const products = await Product.find(q).select('slug name description location price photo').limit(10);
  res.json(products);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map '})
}

exports.heartProduct = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  //We check if our heart includes the current heart that we just posted
  //if it is in there, $pull (mongodb operator)-> with this we are adding the functionallity
  //to remove the heart t
  /**
   * Now we check if the heart that we are just posint is included in the hearts array that we
   * are getting from our collection of hearts, if it is, we need to remove it,dislike functionality
   * if it isnt: we push it in-> like functionality
   */
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User
      //find the user
    .findByIdAndUpdate(req.user._id,
        //update
      { [operator]: { hearts: req.params.id }},
      //Return the updated user
      { new: true }
    );
  //res.json(user);
  res.redirect(`/products`);
};

exports.getHearts = async (req, res) => {
  //Query the products and find those whose id are in our hearts array
    const products = await Product.find({
      //For finding something in an array
      _id: { $in: req.user.hearts }
  });
 // res.json(products);
res.render('products', { title: 'Liked Products', products });
};

