const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { catchErrors } = require('../handlers/errorHandlers');
// Do work here
router.get('/', catchErrors(productController.getProducts));
router.get('/products', catchErrors(productController.getProducts));
router.get('/add',  authController.isLoggedIn, productController.addProduct);

router.post('/add',
    productController.upload,
    catchErrors(productController.resize),
    catchErrors(productController.createProduct)
  );

router.get('/add/:id/',
    productController.upload,
    catchErrors(productController.resize),
    catchErrors(productController.updateProduct)
);

router.get('/delete/:id/',
    catchErrors(productController.deleteProductYes)
);

router.get('/products/:id/edit', catchErrors(productController.editProduct));
router.get('/products/:id/delete', catchErrors(productController.deleteProduct));

router.get('/product/:slug', catchErrors(productController.getProductBySlug));

router.get('/tags', catchErrors(productController.getProductsByTag));

router.get('/tags/:tag', catchErrors(productController.getProductsByTag));

router.get('/login', userController.loginForm);
router.post('/login', authController.login);

router.get('/register', userController.registerForm)
//1. Validate registration data
//2. Register the user
//3. Log the users in
router.post('/register',
    userController.validateRegister,
    userController.register,
    authController.login
);

router.get('/logout', authController.logout);

router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token',
    authController.confirmedPasswords,
    catchErrors(authController.update)
);
router.get('/map', productController.mapPage);
router.get('/hearts', authController.isLoggedIn, catchErrors(productController.getHearts));


/**
 * API
 */

router.get('/api/search', catchErrors(productController.searchProducts));
router.get('/api/products/near', catchErrors(productController.mapProducts));
router.post('/api/products/:id/heart', catchErrors(productController.heartProduct));

module.exports = router;

