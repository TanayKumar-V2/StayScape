import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUserPayload } from '../auth/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('conversations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate or retrieve a conversation between guest and host' })
  @ApiResponse({ status: 200, description: 'Conversation details returned' })
  @ApiResponse({ status: 400, description: 'Self-messaging or invalid booking association' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async createOrGetConversation(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagesService.createOrGetConversation(user.id, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Retrieve conversation inbox for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of conversations with unread counts' })
  async getConversations(@CurrentUser() user: AuthenticatedUserPayload) {
    return this.messagesService.getUserConversations(user.id);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Retrieve paginated messages for a conversation' })
  @ApiResponse({ status: 200, description: 'Paginated messages returned' })
  @ApiResponse({ status: 403, description: 'Not a participant of this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('conversationId') conversationId: string,
    @Query() query: MessageQueryDto,
  ) {
    return this.messagesService.getMessages(user.id, conversationId, query);
  }

  @Post('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message in a conversation (HTTP fallback)' })
  @ApiResponse({ status: 201, description: 'Message sent and persisted successfully' })
  @ApiResponse({ status: 400, description: 'Blank message or archived conversation' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.saveMessage(user.id, conversationId, dto);
  }

  @Post('conversations/:conversationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark messages in a conversation as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markRead(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagesService.markMessagesRead(user.id, conversationId);
  }
}
