const express = require("express");
const routerCart = express.Router();
const { CartItem, User, Product, Cart, Payment } = require("../models/index");

// RUTA "/api/cart"

routerCart.get("/", (req, res) => res.status(200).send("Llegaste a API/CART"));

//Ruta de obtención de todos los Cart de un User
//El front envía el ownerId (id del usuario)
routerCart.post("/userCarts", (req, res) => {
  const id = req.body.ownerId;
  Cart.findAll({ where: { ownerId: id } })
    .then((result) => {
      res.status(200).send(result);
    })
    .catch((err) => console.log(err));
});

// Ruta para obtener carrito vigente de un usuario
// El front envía el ownerId (id del usuario)
routerCart.post("/currentCart", (req, res) => {
  if (!req.body.ownerId) res.send("Debe loguearse");
  else {
    const id = req.body.ownerId;
    Cart.findOne({ where: { ownerId: id, inProgress: true } })
      .then((currentCart) => {
        CartItem.findAll({
          where: { cartId: currentCart.id },
          include: Product,
        }).then((result) =>
          res.status(200).send({ cartId: currentCart.id, productos: result })
        );
      })
      .catch((err) => console.log(err));
  }
});

// Ruta de obtención de todo el detalle de un carrito en particular VIGENTE O NO
// El front envía el cartId (id del Cart)
routerCart.post("/", (req, res) => {
  const id = req.body.cartId;
  Cart.findByPk(id)
    .then((currentCart) => {
      console.log("currentCardId", currentCart.id);
      CartItem.findAll({
        where: { cartId: currentCart.id },
        include: Product,
      }).then((result) =>
        res.status(200).send({ cartId: currentCart.id, productos: result })
      );
    })
    .catch((err) => console.log(err));
});

//Editar cantidad a un producto que ya está en el carrito
//Front envía:
// - id usuario
// - cartNum (número de carrito)
// - Qty (cantidad del producto)
// - productId

// 1 - RESETEO LA CANTIDAD en cartItem del productId donde cartId sea el enviado
// req.body=[{prodId,qty,cartId},{prodId,qty,cartId},{prodId,qty,cartId},{prodId,qty,cartId},{prodId,qty,cartId}]
routerCart.put("/saveCart", (req, res) => {
  CartItem.bulkCreate(req.body, {
    updateOnDuplicate: ["qty"],
  })
});

//Ruta para eliminar un producto del carrito
//Front envía:
// - id usuario
// - cartId (número de carrito)
// - qty (cantidad del producto)
// - productId

// Elimino la linea de producId donde cartId sea el enviado
routerCart.delete("/remProduct", (req, res) => {
  const { cartId, productId } = req.body;
  CartItem.destroy({ where: { cartId: cartId, productId: productId } })
    .then(() => res.status(202).send("Producto eliminado"))
    .catch((err) => console.log(err));
});

//Ruta para agregar producto
//Front envía:
// - cartId (número de carrito)
// - qty (cantidad del producto)
// - productId

// 1 - Busco el "Cart" vigente (de tabla Cart)
// 2 - Busco el "Producto" (de tabla Product)
// 3 - Agrego una línea a cartItem, con la cantidad y el precio (que saco de tablaProduct)
// 4 - Seteo a "Producto" como productId
// 5 - Seteo a "Cart" como cartId

routerCart.post("/addProduct", (req, res) => {
  const { cartId, productId, qty } = req.body;
  CartItem.findOne({ where: { cartId: cartId, productId: productId } })
    .then((productoEncontrado) => {
      if (!productoEncontrado) {
        Cart.findByPk(cartId)
          .then((currentCart) => {
            Product.findByPk(productId)
              .then((currentProduct) => {
                const newItem = {
                  qty: qty,
                  purchasedPrice: currentProduct.price,
                };
                CartItem.create(newItem)
                  .then((addedItem) => addedItem.setCart(currentCart))
                  .then((addedItem) => addedItem.setProduct(currentProduct));
              })
              .then(() => res.status(202).send());
          })
          .catch((err) => console.log(err));
      } else {
        const newQty = qty + productoEncontrado.qty;
        CartItem.update(
          { qty: newQty },
          { where: { cartId: cartId, productId: productId } }
        ).then(() => res.status(202).send());
      }
    })
    .catch((err) => console.log(err));
});

//Ruta para VACIAR carrito
//Front manda
// {cartId}
routerCart.post("cancelCart", (req, res) => {
  CartItem.destroy({ where: { cartId: req.bodycartId } })
    .then(() => res.status(202).send("Ok"))
    .catch((err) => console.log(err));
});

// RUTAS PARA ADMIN

// Ruta para cambiar shippingStatus

routerCart.put("/shippingStatus", (req, res) => {
  const { cartId, status } = req.body;
  Cart.update({ shippingStatus: status }, { where: { cartId: cartId } })
    .then((currentCart) => res.status(202).send(currentCart))
    .catch((err) => console.log(err));
});

// Eliminar un carrito

routerCart.delete("/remCart", (req, res) => {
  const { cartId, ownerId } = req.body;
  Cart.destroy({ where: { cartId: cartId, ownerId: ownerId } })
    .then(() => {
      CartItem.destroy({ where: { cartId: cartId } });
    })
    .then(() => res.status(202).send("Cart eliminado"));
});

module.exports = routerCart;
