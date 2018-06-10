const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const productSchema = new mongoose.Schema({
  name: {
    type: String, 
    trim: true,
    required: 'Please enter a product name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: 'Please enter the price as a number'
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'You must supply an address!'
    }
  },
  photo: String,
  seller: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'Seller data must be supplied'
  }
});

//Define our indexes
productSchema.index({
  name: 'text',
  description:'text'
});
//Store location as geospacial data to set up google maps api search
productSchema.index({ location: '2dsphere'});

productSchema.pre('save', async function(next) {
  if(!this.isModified('name')){
    next(); //skip it
    return; //stop this function from running
  }
  this.slug = slug(this.name); 
    // find other products that have a slug of whatever, whatever-1, whatever-2
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i')
    const productsWithSlug = await this.constructor.find({ slug: slugRegEx });
    if (productsWithSlug.length){
      this.slug = `${this.slug}-${productsWithSlug.length + 1}`;
    }
    
  next();
  //TODO make more resilient so slugs are unique
});

productSchema.statics.getTagsList = function() {
  return this.aggregate([ 
    { $unwind: '$tags'},
    { $group: { _id: '$tags', count: { $sum: 1} }},
    { $sort: { count: -1 }}
  ]);
}
module.exports = mongoose.model('Product', productSchema);