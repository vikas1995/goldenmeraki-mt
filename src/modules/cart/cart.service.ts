import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductsService } from '../products/products.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Cart, CartDocument } from './schemas/cart.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
    private readonly productsService: ProductsService,
  ) {}

  async getCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel
      .findOne({ user: new Types.ObjectId(userId) })
      .populate('items.product')
      .exec();

    if (!cart) {
      cart = new this.cartModel({
        user: new Types.ObjectId(userId),
        items: [],
        totalPrice: 0,
      });
      await cart.save();
    }

    return cart;
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<CartDocument> {
    const { productId, quantity } = addToCartDto;

    const product = await this.productsService.findById(productId);
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found or inactive');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(`Insufficient stock. Only ${product.stock} items available`);
    }

    const price = product.discountPrice ?? product.price;

    let cart = await this.cartModel.findOne({ user: new Types.ObjectId(userId) });
    if (!cart) {
      cart = new this.cartModel({
        user: new Types.ObjectId(userId),
        items: [],
        totalPrice: 0,
      });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (product.stock < newQuantity) {
        throw new BadRequestException(`Cannot add ${quantity} more. Stock limit reached`);
      }
      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].price = price;
    } else {
      cart.items.push({
        product: new Types.ObjectId(productId) as any,
        quantity,
        price,
      });
    }

    cart.totalPrice = this.calculateTotal(cart.items);
    await cart.save();
    return cart.populate('items.product');
  }

  async updateItemQuantity(
    userId: string,
    productId: string,
    updateDto: UpdateCartItemDto,
  ): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ user: new Types.ObjectId(userId) });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart');
    }

    const product = await this.productsService.findById(productId);
    if (product.stock < updateDto.quantity) {
      throw new BadRequestException(`Insufficient stock. Only ${product.stock} available`);
    }

    cart.items[itemIndex].quantity = updateDto.quantity;
    cart.items[itemIndex].price = product.discountPrice ?? product.price;

    cart.totalPrice = this.calculateTotal(cart.items);
    await cart.save();
    return cart.populate('items.product');
  }

  async removeItem(userId: string, productId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ user: new Types.ObjectId(userId) });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    cart.totalPrice = this.calculateTotal(cart.items);
    await cart.save();
    return cart.populate('items.product');
  }

  async clearCart(userId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ user: new Types.ObjectId(userId) });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();
    return cart;
  }

  private calculateTotal(items: any[]): number {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }
}
