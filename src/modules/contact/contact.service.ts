import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateContactDto } from './dto/create-contact.dto';
import { Contact, ContactDocument } from './schemas/contact.schema';

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(Contact.name)
    private readonly contactModel: Model<ContactDocument>,
  ) {}

  async create(createContactDto: CreateContactDto): Promise<ContactDocument> {
    const contact = new this.contactModel(createContactDto);
    return contact.save();
  }

  async findAll(): Promise<ContactDocument[]> {
    return this.contactModel.find().sort({ createdAt: -1 }).exec();
  }

  async markAsRead(id: string): Promise<ContactDocument> {
    const contact = await this.contactModel.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true },
    );
    if (!contact) {
      throw new NotFoundException(`Contact message with ID ${id} not found`);
    }
    return contact;
  }

  async remove(id: string): Promise<{ message: string }> {
    const message = await this.contactModel.findByIdAndDelete(id);
    if (!message) {
      throw new NotFoundException(`Message not found`);
    }
    return { message: 'Message deleted successfully' };
  }
}
