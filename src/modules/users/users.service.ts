import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AddAddressDto } from './dto/add-address.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './enums/user-role.enum';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const { email, password, name, role, phone } = createUserDto;

    const existingUser = await this.userModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const safeRole = role ?? UserRole.ADMIN;

    const newUser = new this.userModel({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: safeRole,
      phone,
    });

    return newUser.save();
  }

  async findByEmail(email: string, selectPassword = false): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ email: email.toLowerCase() });
    if (selectPassword) {
      query.select('+password');
    }
    return query.exec();
  }

  async findById(id: string, selectRefreshToken = false): Promise<UserDocument> {
    const query = this.userModel.findById(id);
    if (selectRefreshToken) {
      query.select('+refreshToken');
    }
    const user = await query.exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    if (refreshToken) {
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      await this.userModel.findByIdAndUpdate(userId, { refreshToken: hashedRefreshToken });
    } else {
      await this.userModel.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    }
  }

  async update(userId: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateUserDto },
      { new: true },
    );
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return updatedUser;
  }

  async addAddress(userId: string, addAddressDto: AddAddressDto): Promise<UserDocument> {
    const user = await this.findById(userId);
    if (addAddressDto.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }
    user.addresses.push(addAddressDto as any);
    return user.save();
  }

  async removeAddress(userId: string, addressId: string): Promise<UserDocument> {
    const user = await this.findById(userId);
    user.addresses = user.addresses.filter((addr: any) => addr._id.toString() !== addressId);
    return user.save();
  }
}
