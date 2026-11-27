import { env } from '../config/env';
// OpenAPI 3 spec served by Swagger UI at /api/docs.
// Keep request schemas in sync with the Joi schemas in each module's *.validation.ts.

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ content: { 'application/json': { schema } } });
const errors = (...codes: number[]) =>
  Object.fromEntries(codes.map((code) => [code, { $ref: `#/components/responses/${code}` }]));

const idParam = { $ref: '#/components/parameters/DeliveryId' };
const pagination = [{ $ref: '#/components/parameters/Limit' }, { $ref: '#/components/parameters/Offset' }];
const statusFilter = { $ref: '#/components/parameters/StatusFilter' };

const bearer = (role: string) => ({ security: [{ bearerAuth: [] }], description: `Requires a **${role}** token.` });

const login = (summary: string, description: string) => ({
  post: {
    tags: ['Auth'],
    summary,
    description,
    requestBody: { required: true, ...json(ref('LoginRequest')) },
    responses: {
      200: { description: 'Signed in', ...json(ref('LoginResponse')) },
      ...errors(400, 401, 429),
    },
  },
});

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SwiftDrop Logistics API',
    version: '1.0.0',
    description: [
      'Customers book and track deliveries, dispatchers assign riders, and riders update delivery status.',
      '',
      '**Authenticating in this page:** call one of the login endpoints, copy the `token` from the response,',
      'click **Authorize** and paste it. Each token carries a single role, and endpoints reject tokens for other roles.',
      '',
      '**Seeded accounts** have no password. Use the activation endpoints first; in development the activation',
      'link (containing the token) is printed in the server console.',
    ].join('\n'),
  },
  servers: [{ url: `${env.basePath}/api/v1` }],
  tags: [
    { name: 'Auth', description: 'Login and account activation' },
    { name: 'Customer', description: 'Customer profile and own deliveries' },
    { name: 'Admin', description: 'Admin / dispatcher operations' },
    { name: 'Rider', description: 'Rider jobs and status updates' },
    { name: 'Tracking', description: 'Public parcel tracking by tracking code' },
  ],
  paths: {
    '/auth/login': login(
      'Customer login',
      'Returns a JWT with role `customer`, and emails the customer a sign-in notice (time, device, IP).',
    ),
    '/auth/rider/login': login('Rider login', 'Returns a JWT with role `rider`.'),
    '/auth/staff/login': login('Staff login', 'Returns a JWT with role `admin` or `dispatcher`.'),

    '/auth/activation/request': {
      post: {
        tags: ['Auth'],
        summary: 'Request a set-password link',
        description:
          'Sends a single-use link (valid 60 minutes) to set a password. An unknown customer email creates a customer account; riders must already exist. Always returns 202.',
        requestBody: { required: true, ...json(ref('ActivationRequest')) },
        responses: { 202: { description: 'Accepted', ...json(ref('Message')) }, ...errors(400, 429) },
      },
    },
    '/auth/activation/complete': {
      post: {
        tags: ['Auth'],
        summary: 'Set a password using an activation token',
        requestBody: { required: true, ...json(ref('ActivationComplete')) },
        responses: {
          200: {
            description: 'Password set',
            ...json({
              allOf: [
                ref('Message'),
                { type: 'object', properties: { accountType: { type: 'string', enum: ['customer', 'rider'] } } },
              ],
            }),
          },
          ...errors(400, 429),
        },
      },
    },

    '/customers/me': {
      get: {
        tags: ['Customer'],
        summary: "Logged-in customer's profile",
        ...bearer('customer'),
        responses: { 200: { description: 'Profile', ...json(ref('Customer')) }, ...errors(401, 403, 404) },
      },
    },

    '/deliveries': {
      post: {
        tags: ['Customer'],
        summary: 'Create a delivery',
        ...bearer('customer'),
        requestBody: { required: true, ...json(ref('CreateDeliveryRequest')) },
        responses: { 201: { description: 'Created', ...json(ref('DeliveryWithHistory')) }, ...errors(400, 401, 403) },
      },
      get: {
        tags: ['Customer'],
        summary: "List the customer's own deliveries",
        ...bearer('customer'),
        parameters: pagination,
        responses: {
          200: { description: 'Newest first', ...json({ type: 'array', items: ref('Delivery') }) },
          ...errors(400, 401, 403),
        },
      },
    },
    '/deliveries/summary': {
      get: {
        tags: ['Customer'],
        summary: "Counts of the customer's deliveries by stage",
        ...bearer('customer'),
        responses: {
          200: {
            description: 'Counts',
            ...json({
              type: 'object',
              properties: {
                total: { type: 'integer' },
                pending: { type: 'integer' },
                onTheWay: { type: 'integer', description: 'assigned + picked_up + in_transit' },
                delivered: { type: 'integer' },
                cancelled: { type: 'integer' },
              },
            }),
          },
          ...errors(401, 403),
        },
      },
    },
    '/track/{trackingCode}': {
      get: {
        tags: ['Tracking'],
        summary: 'Track a parcel (no sign-in needed)',
        description:
          'Returns status and timestamps only. No addresses, names, phone numbers or notes. Rate-limited to 60 lookups per 15 minutes per IP.',
        parameters: [
          { name: 'trackingCode', in: 'path', required: true, schema: { type: 'string', example: 'LG-7KQ2M9XHPT' } },
        ],
        responses: {
          200: {
            description: 'Tracking status',
            ...json({
              type: 'object',
              properties: {
                trackingCode: { type: 'string' },
                status: ref('DeliveryStatus'),
                createdAt: { type: 'string', format: 'date-time' },
                assignedAt: { type: 'string', format: 'date-time', nullable: true },
                pickedUpAt: { type: 'string', format: 'date-time', nullable: true },
                deliveredAt: { type: 'string', format: 'date-time', nullable: true },
                updatedAt: { type: 'string', format: 'date-time' },
                history: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { status: ref('DeliveryStatus'), at: { type: 'string', format: 'date-time' } },
                  },
                },
              },
            }),
          },
          ...errors(400, 404, 429),
        },
      },
    },
    '/deliveries/{id}': {
      get: {
        tags: ['Customer'],
        summary: 'Get one of your deliveries with its tracking history',
        description: `${bearer('customer').description} Returns 404 for deliveries that belong to another customer.`,
        security: bearer('customer').security,
        parameters: [idParam],
        responses: {
          200: { description: 'Delivery', ...json(ref('DeliveryWithHistory')) },
          ...errors(400, 401, 403, 404),
        },
      },
    },
    '/deliveries/{id}/cancel': {
      patch: {
        tags: ['Customer'],
        summary: 'Cancel a pending delivery',
        ...bearer('customer'),
        parameters: [idParam],
        responses: {
          200: { description: 'Cancelled', ...json(ref('DeliveryWithHistory')) },
          ...errors(401, 403, 404, 409),
        },
      },
    },

    '/admin/deliveries': {
      get: {
        tags: ['Admin'],
        summary: 'List all deliveries',
        ...bearer('admin or dispatcher'),
        parameters: [statusFilter, ...pagination],
        responses: {
          200: { description: 'Newest first', ...json({ type: 'array', items: ref('Delivery') }) },
          ...errors(400, 401, 403),
        },
      },
    },
    '/admin/deliveries/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get any delivery with its history',
        ...bearer('admin or dispatcher'),
        parameters: [idParam],
        responses: {
          200: { description: 'Delivery', ...json(ref('DeliveryWithHistory')) },
          ...errors(400, 401, 403, 404),
        },
      },
    },
    '/admin/deliveries/{id}/assign': {
      patch: {
        tags: ['Admin'],
        summary: 'Assign or reassign a rider',
        description:
          'Allowed while the delivery is `pending` or `assigned`. The rider must be active, activated, and available.',
        security: [{ bearerAuth: [] }],
        parameters: [idParam],
        requestBody: { required: true, ...json(ref('AssignRiderRequest')) },
        responses: {
          200: { description: 'Assigned', ...json(ref('DeliveryWithHistory')) },
          ...errors(400, 401, 403, 404, 409),
        },
      },
    },
    '/admin/riders': {
      get: {
        tags: ['Admin'],
        summary: 'List active riders with availability and workload',
        ...bearer('admin or dispatcher'),
        responses: {
          200: { description: 'Riders', ...json({ type: 'array', items: ref('RiderSummary') }) },
          ...errors(401, 403),
        },
      },
    },

    '/rider/me': {
      get: {
        tags: ['Rider'],
        summary: "Logged-in rider's profile",
        ...bearer('rider'),
        responses: { 200: { description: 'Profile', ...json(ref('RiderProfile')) }, ...errors(401, 403, 404) },
      },
    },
    '/rider/me/availability': {
      patch: {
        tags: ['Rider'],
        summary: 'Go on or off duty',
        ...bearer('rider'),
        requestBody: {
          required: true,
          ...json({ type: 'object', required: ['isAvailable'], properties: { isAvailable: { type: 'boolean' } } }),
        },
        responses: { 200: { description: 'Updated profile', ...json(ref('RiderProfile')) }, ...errors(400, 401, 403) },
      },
    },
    '/rider/deliveries': {
      get: {
        tags: ['Rider'],
        summary: 'Deliveries assigned to me',
        ...bearer('rider'),
        parameters: [statusFilter, ...pagination],
        responses: {
          200: { description: 'Most recently updated first', ...json({ type: 'array', items: ref('Delivery') }) },
          ...errors(400, 401, 403),
        },
      },
    },
    '/rider/deliveries/{id}/status': {
      patch: {
        tags: ['Rider'],
        summary: 'Update the status of one of my deliveries',
        description:
          'Allowed transitions: `assigned → picked_up`, `picked_up → in_transit | delivered`, `in_transit → delivered`.',
        security: [{ bearerAuth: [] }],
        parameters: [idParam],
        requestBody: { required: true, ...json(ref('RiderStatusRequest')) },
        responses: {
          200: { description: 'Updated', ...json(ref('DeliveryWithHistory')) },
          ...errors(400, 401, 403, 404, 409),
        },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    parameters: {
      DeliveryId: { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      Limit: { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
      Offset: { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
      StatusFilter: { name: 'status', in: 'query', schema: ref('DeliveryStatus') },
    },
    responses: {
      400: { description: 'Validation error', ...json(ref('Error')) },
      401: { description: 'Missing, invalid or expired token / invalid credentials', ...json(ref('Error')) },
      403: { description: 'Token role is not allowed here', ...json(ref('Error')) },
      404: { description: 'Not found', ...json(ref('Error')) },
      409: { description: 'Not allowed in the current state', ...json(ref('Error')) },
      429: { description: 'Too many auth attempts', ...json(ref('Error')) },
    },
    schemas: {
      DeliveryStatus: {
        type: 'string',
        enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: {
                type: 'array',
                items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } },
              },
            },
          },
        },
      },
      Message: { type: 'object', properties: { message: { type: 'string' } } },

      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          password: { type: 'string', format: 'password' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT, valid for 1 hour' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string', enum: ['customer', 'rider', 'admin', 'dispatcher'] },
            },
          },
        },
      },
      ActivationRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          accountType: { type: 'string', enum: ['customer', 'rider'], default: 'customer' },
        },
      },
      ActivationComplete: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string', description: 'The `token` query parameter from the activation link' },
          password: {
            type: 'string',
            format: 'password',
            minLength: 10,
            description: 'At least 10 characters, with at least one letter and one number',
          },
        },
      },

      Customer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      CreateDeliveryRequest: {
        type: 'object',
        required: ['pickupAddress', 'deliveryAddress', 'recipientName', 'recipientPhone', 'packageDescription'],
        properties: {
          pickupAddress: { type: 'string', minLength: 5, maxLength: 500, example: '12 Admiralty Way, Lekki, Lagos' },
          deliveryAddress: { type: 'string', minLength: 5, maxLength: 500, example: '4 Allen Avenue, Ikeja, Lagos' },
          recipientName: { type: 'string', minLength: 2, maxLength: 150, example: 'Tunde Ade' },
          recipientPhone: { type: 'string', pattern: '^\\+?[0-9\\s-]{7,20}$', example: '+2348031234567' },
          packageDescription: { type: 'string', minLength: 2, maxLength: 500, example: 'Documents in an envelope' },
          packageWeightKg: { type: 'number', exclusiveMinimum: true, minimum: 0, maximum: 10000, example: 0.5 },
          notes: { type: 'string', maxLength: 1000, example: 'Call on arrival' },
        },
      },
      Delivery: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          trackingCode: { type: 'string', example: 'LG-J7FNNXHXE6' },
          status: ref('DeliveryStatus'),
          pickupAddress: { type: 'string' },
          deliveryAddress: { type: 'string' },
          recipient: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' } } },
          package: {
            type: 'object',
            properties: { description: { type: 'string' }, weightKg: { type: 'number', nullable: true } },
          },
          notes: { type: 'string', nullable: true },
          rider: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              phone: { type: 'string' },
            },
          },
          customer: {
            type: 'object',
            description: 'Included for staff and rider views only',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
          assignedAt: { type: 'string', format: 'date-time', nullable: true },
          pickedUpAt: { type: 'string', format: 'date-time', nullable: true },
          deliveredAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      HistoryEntry: {
        type: 'object',
        properties: {
          fromStatus: { ...ref('DeliveryStatus'), nullable: true },
          toStatus: ref('DeliveryStatus'),
          changedBy: { type: 'string', enum: ['customer', 'staff', 'rider', 'system'] },
          note: { type: 'string', nullable: true },
          at: { type: 'string', format: 'date-time' },
        },
      },
      DeliveryWithHistory: {
        allOf: [
          ref('Delivery'),
          { type: 'object', properties: { history: { type: 'array', items: ref('HistoryEntry') } } },
        ],
      },

      AssignRiderRequest: {
        type: 'object',
        required: ['riderId'],
        properties: { riderId: { type: 'string', format: 'uuid' } },
      },
      RiderSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          isAvailable: { type: 'boolean' },
          isActivated: { type: 'boolean', description: 'Whether the rider has set a password' },
          activeDeliveries: { type: 'integer' },
        },
      },
      RiderProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          isAvailable: { type: 'boolean' },
          activeDeliveries: { type: 'integer' },
        },
      },
      RiderStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['picked_up', 'in_transit', 'delivered'] },
          note: { type: 'string', maxLength: 500 },
        },
      },
    },
  },
};
