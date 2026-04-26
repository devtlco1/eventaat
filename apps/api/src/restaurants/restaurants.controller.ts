import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  Restaurant,
  RestaurantAdmin,
  RestaurantContact,
  Reservation,
  RestaurantTable,
} from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SafeUser } from '../users/users.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { AssignAdminDto } from './dto/assign-admin.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { CreateRestaurantTableDto } from './dto/create-restaurant-table.dto';
import { CreateRestaurantContactDto } from './dto/create-restaurant-contact.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { UpdateRestaurantContactDto } from './dto/update-restaurant-contact.dto';
import { UpdateRestaurantProfileDto } from './dto/update-restaurant-profile.dto';
import { CreateRestaurantEventDto } from './dto/create-restaurant-event.dto';
import { ListRestaurantEventsQueryDto } from './dto/list-restaurant-events-query.dto';
import { CreateEventReservationDto } from './dto/create-event-reservation.dto';
import { ListEventReservationsQueryDto } from './dto/list-event-reservations-query.dto';
import { UpdateRestaurantEventDto } from './dto/update-restaurant-event.dto';
import { UpdateEventReservationStatusDto } from './dto/update-event-reservation-status.dto';
import { ReviewRestaurantEventDto } from './dto/review-restaurant-event.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { UpdateRestaurantTableDto } from './dto/update-restaurant-table.dto';
import { UpdateOpeningHoursDto } from './dto/update-opening-hours.dto';
import { UpdateOperatingSettingsDto } from './dto/update-operating-settings.dto';
import { EventReservationService } from './event-reservation.service';
import { RestaurantsService } from './restaurants.service';

/**
 * All routes require a valid Bearer token (JwtAuthGuard at controller level).
 * RolesGuard is also active; @Roles() on a method narrows it further.
 * Methods without @Roles() are open to any authenticated user.
 */
@Controller('restaurants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RestaurantsController {
  constructor(
    private readonly restaurants: RestaurantsService,
    private readonly eventReservations: EventReservationService,
  ) {}

  // ─── Core CRUD ─────────────────────────────────────────────────────────────

  @Post()
  @Roles('PLATFORM_ADMIN')
  create(@Body() dto: CreateRestaurantDto): Promise<Restaurant> {
    return this.restaurants.create(dto);
  }

  @Get()
  list(@CurrentUser() user: SafeUser): Promise<Restaurant[]> {
    return this.restaurants.list(user);
  }

  /**
   * GET /restaurants/:restaurantId/availability
   * Any authenticated user can query availability (CUSTOMER/RESTAURANT_ADMIN/PLATFORM_ADMIN).
   */
  @Get(':restaurantId/availability')
  availability(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.restaurants.getAvailability(restaurantId, query);
  }

  @Get(':restaurantId/operating-settings')
  getOperatingSettings(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.getOperatingSettings(restaurantId, user);
  }

  @Patch(':restaurantId/operating-settings')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  patchOperatingSettings(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Body() dto: UpdateOperatingSettingsDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.updateOperatingSettings(restaurantId, dto, user);
  }

  @Get(':restaurantId/opening-hours')
  getOpeningHours(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.getOpeningHours(restaurantId, user);
  }

  @Patch(':restaurantId/opening-hours')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  patchOpeningHours(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Body() dto: UpdateOpeningHoursDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.updateOpeningHours(restaurantId, dto, user);
  }

  @Get(':restaurantId/profile')
  getRestaurantProfile(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.getRestaurantProfile(restaurantId, user);
  }

  @Patch(':restaurantId/profile')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  patchRestaurantProfile(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Body() dto: UpdateRestaurantProfileDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.updateRestaurantProfile(restaurantId, dto, user);
  }

  @Get(':restaurantId/contacts')
  getRestaurantContacts(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.getRestaurantContacts(restaurantId, user);
  }

  @Post(':restaurantId/contacts')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  createRestaurantContact(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Body() dto: CreateRestaurantContactDto,
    @CurrentUser() user: SafeUser,
  ): Promise<RestaurantContact> {
    return this.restaurants.createRestaurantContact(restaurantId, dto, user);
  }

  @Patch(':restaurantId/contacts/:contactId')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  updateRestaurantContact(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Param('contactId', new ParseUUIDPipe()) contactId: string,
    @Body() dto: UpdateRestaurantContactDto,
    @CurrentUser() user: SafeUser,
  ): Promise<RestaurantContact> {
    return this.restaurants.updateRestaurantContact(
      restaurantId,
      contactId,
      dto,
      user,
    );
  }

  @Delete(':restaurantId/contacts/:contactId')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRestaurantContact(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Param('contactId', new ParseUUIDPipe()) contactId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<void> {
    return this.restaurants.deleteRestaurantContact(
      restaurantId,
      contactId,
      user,
    );
  }

  // ─── Restaurant events (Event Nights) ─────────────────────────────────

  @Get(':restaurantId/events')
  listEvents(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Query() query: ListRestaurantEventsQueryDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.listRestaurantEvents(restaurantId, query, user);
  }

  @Post(':restaurantId/events')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  createEvent(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Body() dto: CreateRestaurantEventDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.createRestaurantEvent(restaurantId, dto, user);
  }

  @Get(':restaurantId/events/:eventId')
  getEvent(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.getRestaurantEvent(restaurantId, eventId, user);
  }

  @Patch(':restaurantId/events/:eventId/review')
  @Roles('PLATFORM_ADMIN')
  reviewEvent(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() dto: ReviewRestaurantEventDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.reviewRestaurantEvent(
      restaurantId,
      eventId,
      dto,
      user,
    );
  }

  @Patch(':restaurantId/events/:eventId')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  updateEvent(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() dto: UpdateRestaurantEventDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.updateRestaurantEvent(
      restaurantId,
      eventId,
      dto,
      user,
    );
  }

  @Delete(':restaurantId/events/:eventId')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivateEvent(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<void> {
    return this.restaurants.deactivateRestaurantEvent(
      restaurantId,
      eventId,
      user,
    );
  }

  /**
   * POST /restaurants/:restaurantId/events/:eventId/reservations
   * Event booking request; starts PENDING (CUSTOMER only).
   */
  @Post(':restaurantId/events/:eventId/reservations')
  @Roles('CUSTOMER')
  createEventReservation(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() dto: CreateEventReservationDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.eventReservations.createEventReservation(
      restaurantId,
      eventId,
      dto,
      user,
    );
  }

  /**
   * GET /restaurants/:restaurantId/event-reservations?eventId=
   * List event booking requests; PLATFORM or assigned RESTAURANT admin.
   */
  @Get(':restaurantId/event-reservations')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  listEventReservations(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Query() query: ListEventReservationsQueryDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.eventReservations.listRestaurantEventReservations(
      restaurantId,
      user,
      query.eventId,
    );
  }

  @Patch(':restaurantId/event-reservations/:eventReservationId/status')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  updateEventReservationStatus(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Param('eventReservationId', new ParseUUIDPipe()) eventReservationId: string,
    @Body() dto: UpdateEventReservationStatusDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.eventReservations.updateEventReservationStatus(
      restaurantId,
      eventReservationId,
      dto,
      user,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<Restaurant> {
    return this.restaurants.findOne(id, user);
  }

  @Patch(':id')
  @Roles('PLATFORM_ADMIN')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    return this.restaurants.update(id, dto);
  }

  // ─── Admin Assignment (PLATFORM_ADMIN only) ────────────────────────────────

  /**
   * POST /restaurants/:id/admins
   * Body: { "userId": "<uuid>" }
   * Assigns a RESTAURANT_ADMIN user to this restaurant.
   */
  @Post(':id/admins')
  @Roles('PLATFORM_ADMIN')
  assignAdmin(
    @Param('id', new ParseUUIDPipe()) restaurantId: string,
    @Body() dto: AssignAdminDto,
  ): Promise<RestaurantAdmin> {
    return this.restaurants.assignAdmin(restaurantId, dto.userId);
  }

  /**
   * GET /restaurants/:id/admins
   * Lists all admins assigned to this restaurant (with basic user info).
   */
  @Get(':id/admins')
  @Roles('PLATFORM_ADMIN')
  listAdmins(
    @Param('id', new ParseUUIDPipe()) restaurantId: string,
  ): Promise<Array<RestaurantAdmin & { user: SafeUser }>> {
    return this.restaurants.listAdmins(restaurantId);
  }

  /**
   * DELETE /restaurants/:id/admins/:userId
   * Removes the admin assignment for a specific user.
   */
  @Delete(':id/admins/:userId')
  @Roles('PLATFORM_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAdmin(
    @Param('id', new ParseUUIDPipe()) restaurantId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<void> {
    return this.restaurants.removeAdmin(restaurantId, userId);
  }

  // ─── Restaurant Tables ─────────────────────────────────────────────────────

  /**
   * POST /restaurants/:restaurantId/tables
   * PLATFORM_ADMIN: allowed for any restaurant
   * RESTAURANT_ADMIN: allowed only for assigned restaurants
   */
  @Post(':restaurantId/tables')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  createTable(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Body() dto: CreateRestaurantTableDto,
    @CurrentUser() user: SafeUser,
  ): Promise<RestaurantTable> {
    return this.restaurants.createTable(restaurantId, dto, user);
  }

  /**
   * GET /restaurants/:restaurantId/tables
   * CUSTOMER: active tables only
   * Others: active + inactive
   */
  @Get(':restaurantId/tables')
  listTables(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<RestaurantTable[]> {
    return this.restaurants.listTables(restaurantId, user);
  }

  /**
   * GET /restaurants/:restaurantId/tables/:tableId
   * CUSTOMER: 404 for inactive tables
   */
  @Get(':restaurantId/tables/:tableId')
  findTable(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<RestaurantTable> {
    return this.restaurants.findTable(restaurantId, tableId, user);
  }

  /**
   * PATCH /restaurants/:restaurantId/tables/:tableId
   * PLATFORM_ADMIN: allowed for any restaurant
   * RESTAURANT_ADMIN: allowed only for assigned restaurants
   */
  @Patch(':restaurantId/tables/:tableId')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  updateTable(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
    @Body() dto: UpdateRestaurantTableDto,
    @CurrentUser() user: SafeUser,
  ): Promise<RestaurantTable> {
    return this.restaurants.updateTable(restaurantId, tableId, dto, user);
  }

  // ─── Reservations ──────────────────────────────────────────────────────────

  /**
   * POST /restaurants/:restaurantId/reservations
   * CUSTOMER only — creates PENDING reservation.
   */
  @Post(':restaurantId/reservations')
  @Roles('CUSTOMER')
  createReservation(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: SafeUser,
  ): Promise<Reservation> {
    return this.restaurants.createReservation(restaurantId, dto, user);
  }

  /**
   * GET /restaurants/:restaurantId/reservations
   * PLATFORM_ADMIN: any restaurant
   * RESTAURANT_ADMIN: assigned restaurants only
   */
  @Get(':restaurantId/reservations')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  listRestaurantReservations(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.listRestaurantReservations(restaurantId, user);
  }

  /**
   * GET /restaurants/:restaurantId/reservations/:reservationId/history
   * Status audit trail. PLATFORM_ADMIN and assigned RESTAURANT_ADMIN only.
   */
  @Get(':restaurantId/reservations/:reservationId/history')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  getReservationStatusHistory(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Param('reservationId', new ParseUUIDPipe()) reservationId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.getReservationStatusHistory(
      restaurantId,
      reservationId,
      user,
    );
  }

  /**
   * PATCH /restaurants/:restaurantId/reservations/:reservationId/status
   * Optional body: { status, note? }. Validates lifecycle transitions.
   */
  @Patch(':restaurantId/reservations/:reservationId/status')
  @Roles('PLATFORM_ADMIN', 'RESTAURANT_ADMIN')
  updateReservationStatus(
    @Param('restaurantId', new ParseUUIDPipe()) restaurantId: string,
    @Param('reservationId', new ParseUUIDPipe()) reservationId: string,
    @Body() dto: UpdateReservationStatusDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.updateReservationStatus(
      restaurantId,
      reservationId,
      dto,
      user,
    );
  }
}
