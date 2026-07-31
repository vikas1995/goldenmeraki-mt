import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AddAddressDto } from './dto/add-address.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './enums/user-role.enum';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profile')
  @ApiOperation({ summary: 'Update logged in user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, updateUserDto);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add a new shipping/billing address' })
  @ApiResponse({ status: 201, description: 'Address added successfully' })
  addAddress(
    @CurrentUser('userId') userId: string,
    @Body() addAddressDto: AddAddressDto,
  ) {
    return this.usersService.addAddress(userId, addAddressDto);
  }

  @Delete('addresses/:addressId')
  @ApiOperation({ summary: 'Delete an address by ID' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  removeAddress(
    @CurrentUser('userId') userId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.usersService.removeAddress(userId, addressId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user details by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
