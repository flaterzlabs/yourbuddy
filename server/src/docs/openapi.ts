import type { OpenAPIV3 } from "openapi-types";

const bearerAuth: OpenAPIV3.SecuritySchemeObject = {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Include the access token returned by /auth/login or /auth/signup.",
};

export const openApiDocument: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "YourBuddy API",
    description: "Endpoints expostos pelo backend Node.js + PostgreSQL.",
    version: "0.1.0",
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Ambiente local",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth,
    },
    schemas: {
      SignUpRequest: {
        type: "object",
        required: ["email", "password", "role", "username"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          role: { type: "string", enum: ["student", "caregiver", "educator"] },
          username: { type: "string", minLength: 3, maxLength: 50 },
        },
      },
      SignInRequest: {
        type: "object",
        required: ["identifier", "password"],
        properties: {
          identifier: {
            type: "string",
            description: "Email ou username",
          },
          password: { type: "string", minLength: 8 },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
              role: { type: "string" },
            },
          },
          profile: { type: "object" },
          thriveSprite: { type: ["object", "null"] },
        },
      },
      ResetRequest: {
        type: "object",
        required: ["identifier"],
        properties: {
          identifier: {
            type: "string",
            description: "Email ou username",
          },
        },
      },
      ResetPasswordInput: {
        type: "object",
        required: ["token", "password"],
        properties: {
          token: { type: "string" },
          password: { type: "string", minLength: 8 },
        },
      },
      ConnectionByCode: {
        type: "object",
        required: ["code"],
        properties: {
          code: { type: "string" },
        },
      },
      HelpRequestInput: {
        type: "object",
        properties: {
          message: { type: "string", maxLength: 500 },
          urgency: {
            type: "string",
            enum: ["ok", "attention", "urgent"],
          },
        },
      },
      HelpRequestStatusInput: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["answered", "closed"],
          },
        },
      },
      ThriveSpriteInput: {
        type: "object",
        required: ["imageUrl"],
        properties: {
          imageUrl: { type: "string", format: "uri" },
          options: { type: "object", nullable: true },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Status da API",
        responses: {
          200: {
            description: "API respondendo",
          },
        },
      },
    },
    "/auth/signup": {
      post: {
        summary: "Cria uma conta",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SignUpRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Conta criada com sucesso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: { description: "Erro de validação" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Autentica um usuário",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SignInRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Login bem-sucedido",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: { description: "Credenciais inválidas" },
        },
      },
    },
    "/auth/me": {
      get: {
        summary: "Retorna sessão atual",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Sessão ativa",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          401: { description: "Não autenticado" },
        },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Finaliza a sessão atual (client-side)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Logout ok" },
        },
      },
    },
    "/auth/password/reset-request": {
      post: {
        summary: "Gera token de reset de senha",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResetRequest" },
            },
          },
        },
        responses: {
          200: { description: "Token gerado" },
          400: { description: "Erro de validação" },
        },
      },
    },
    "/auth/password/reset": {
      post: {
        summary: "Atualiza a senha via token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResetPasswordInput" },
            },
          },
        },
        responses: {
          200: { description: "Senha atualizada" },
          400: { description: "Token inválido ou expirado" },
        },
      },
    },
    "/profiles/me": {
      get: {
        summary: "Perfil do usuário autenticado",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Perfil retornado" },
          401: { description: "Não autenticado" },
        },
      },
    },
    "/connections": {
      get: {
        summary: "Lista conexões do usuário (role dependente)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Lista retornada" },
          401: { description: "Não autenticado" },
        },
      },
    },
    "/connections/by-student-code": {
      post: {
        summary: "Conecta cuidador a estudante via código",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ConnectionByCode" },
            },
          },
        },
        responses: {
          200: { description: "Conexão criada" },
          400: { description: "Código inválido" },
          403: { description: "Role não autorizada" },
        },
      },
    },
    "/connections/by-caregiver-code": {
      post: {
        summary: "Conecta estudante a cuidador via código",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ConnectionByCode" },
            },
          },
        },
        responses: {
          200: { description: "Conexão criada" },
          400: { description: "Código inválido" },
          403: { description: "Role não autorizada" },
        },
      },
    },
    "/help-requests": {
      get: {
        summary: "Lista pedidos de ajuda do usuário (ou alunos conectados)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Pedidos retornados" },
          401: { description: "Não autenticado" },
        },
      },
      post: {
        summary: "Cria pedido de ajuda (estudante)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/HelpRequestInput" },
            },
          },
        },
        responses: {
          201: { description: "Pedido criado" },
          403: { description: "Role não autorizada" },
        },
      },
    },
    "/help-requests/{id}": {
      patch: {
        summary: "Atualiza status de um pedido (cuidador)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/HelpRequestStatusInput" },
            },
          },
        },
        responses: {
          200: { description: "Pedido atualizado" },
          403: { description: "Role não autorizada" },
        },
      },
    },
    "/thrive-sprites/me": {
      get: {
        summary: "Retorna avatar do estudante autenticado",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Avatar retornado (ou null)" },
          403: { description: "Role não autorizada" },
        },
      },
      put: {
        summary: "Atualiza avatar do estudante",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ThriveSpriteInput" },
            },
          },
        },
        responses: {
          200: { description: "Avatar salvo" },
          403: { description: "Role não autorizada" },
        },
      },
    },
  },
};
