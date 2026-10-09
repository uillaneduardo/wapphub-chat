import type { Resource } from '../types/resources';
// Test-only snapshot of the M2.1 Core catalog. Never used to authorize the app.
export const resourceFixture: Resource[] = [
  {
    "code": "organization.context",
    "module": "Preferências",
    "name": "Contexto da organização",
    "description": "Contexto da organização da organização selecionada, conforme permissões efetivas e regras operacionais.",
    "permissions": [
      "organization.read"
    ],
    "availability": "AVAILABLE",
    "navigation": false,
    "dependencies": [],
    "base": true,
    "entitlement": null
  },
  {
    "code": "chat.conversations",
    "module": "Atendimento",
    "name": "Conversas",
    "description": "Conversas da organização selecionada, conforme permissões efetivas e regras operacionais.",
    "permissions": [
      "conversations.read",
      "conversations.create"
    ],
    "availability": "AVAILABLE",
    "navigation": true,
    "dependencies": [],
    "base": true,
    "entitlement": null
  },
  {
    "code": "chat.text",
    "module": "Atendimento",
    "name": "Mensagens de texto",
    "description": "Mensagens de texto da organização selecionada, conforme permissões efetivas e regras operacionais.",
    "permissions": [
      "messages.read",
      "messages.send"
    ],
    "availability": "AVAILABLE",
    "navigation": false,
    "dependencies": [
      "chat.conversations"
    ],
    "base": true,
    "entitlement": null
  },
  {
    "code": "chat.contacts",
    "module": "Atendimento",
    "name": "Contatos",
    "description": "Contatos da organização selecionada, conforme permissões efetivas e regras operacionais.",
    "permissions": [
      "contacts.read",
      "contacts.write"
    ],
    "availability": "AVAILABLE",
    "navigation": true,
    "dependencies": [],
    "base": true,
    "entitlement": null
  },
  {
    "code": "conversation.archive",
    "module": "Atendimento",
    "name": "Arquivamento",
    "description": "Arquivamento da organização selecionada, conforme permissões efetivas e regras operacionais.",
    "permissions": [
      "conversations.archive"
    ],
    "availability": "AVAILABLE",
    "navigation": false,
    "dependencies": [
      "chat.conversations"
    ],
    "base": true,
    "entitlement": null
  },
  {
    "code": "conversation.assignment",
    "module": "Atendimento",
    "name": "Atribuição",
    "description": "Atribuição da organização selecionada, conforme permissões efetivas e regras operacionais.",
    "permissions": [
      "conversations.assign"
    ],
    "availability": "AVAILABLE",
    "navigation": false,
    "dependencies": [
      "chat.conversations"
    ],
    "base": true,
    "entitlement": null
  },
  {
    "code": "conversation.transfer",
    "module": "Atendimento",
    "name": "Transferência",
    "description": "Transferência da organização selecionada, conforme permissões efetivas e regras operacionais.",
    "permissions": [
      "conversations.transfer"
    ],
    "availability": "AVAILABLE",
    "navigation": false,
    "dependencies": [
      "chat.conversations"
    ],
    "base": true,
    "entitlement": null
  },
  {
    "code": "conversation.supervision",
    "module": "Atendimento",
    "name": "Supervisão",
    "description": "Supervisão da organização selecionada, conforme permissões efetivas e regras operacionais.",
    "permissions": [
      "conversations.supervise"
    ],
    "availability": "AVAILABLE",
    "navigation": false,
    "dependencies": [
      "chat.conversations"
    ],
    "base": true,
    "entitlement": null
  },
  {
    "code": "conversation.internal_notes",
    "module": "Atendimento",
    "name": "Notas internas",
    "description": "Notas internas da organização selecionada, conforme permissões efetivas e regras operacionais.",
    "permissions": [
      "notes.read",
      "notes.create"
    ],
    "availability": "AVAILABLE",
    "navigation": false,
    "dependencies": [
      "chat.conversations"
    ],
    "base": true,
    "entitlement": null
  },
  {
    "code": "conversation.tags",
    "module": "Atendimento",
    "name": "Etiquetas nas conversas",
    "description": "Etiquetas nas conversas da organização selecionada, conforme permissões efetivas e regras operacionais.",
    "permissions": [
      "tags.read",
      "tags.manage"
    ],
    "availability": "AVAILABLE",
    "navigation": false,
    "dependencies": [],
    "base": true,
    "entitlement": null
  },
  {
    "code": "chat.files",
    "module": "Atendimento",
    "name": "Arquivos",
    "description": "Arquivos ainda indisponível; não pode ser ativado nesta etapa.",
    "permissions": [],
    "availability": "PLANNED",
    "navigation": false,
    "dependencies": [],
    "base": false,
    "entitlement": null
  },
  {
    "code": "chat.quick_replies",
    "module": "Produtividade",
    "name": "Respostas rápidas",
    "description": "Respostas rápidas ainda indisponível; não pode ser ativado nesta etapa.",
    "permissions": [],
    "availability": "PLANNED",
    "navigation": false,
    "dependencies": [],
    "base": false,
    "entitlement": null
  },
  {
    "code": "chat.automations",
    "module": "Produtividade",
    "name": "Automações",
    "description": "Automações ainda indisponível; não pode ser ativado nesta etapa.",
    "permissions": [],
    "availability": "PLANNED",
    "navigation": false,
    "dependencies": [],
    "base": false,
    "entitlement": null
  },
  {
    "code": "chat.bots",
    "module": "Produtividade",
    "name": "Bots",
    "description": "Bots ainda indisponível; não pode ser ativado nesta etapa.",
    "permissions": [],
    "availability": "PLANNED",
    "navigation": false,
    "dependencies": [],
    "base": false,
    "entitlement": null
  },
  {
    "code": "chat.campaigns",
    "module": "Comunicação",
    "name": "Campanhas",
    "description": "Campanhas ainda indisponível; não pode ser ativado nesta etapa.",
    "permissions": [],
    "availability": "PLANNED",
    "navigation": false,
    "dependencies": [],
    "base": false,
    "entitlement": null
  },
  {
    "code": "whatsapp.status",
    "module": "Comunicação",
    "name": "Status",
    "description": "Status ainda indisponível; não pode ser ativado nesta etapa.",
    "permissions": [],
    "availability": "RESEARCH",
    "navigation": false,
    "dependencies": [],
    "base": false,
    "entitlement": null
  },
  {
    "code": "calling.audio",
    "module": "Comunicação",
    "name": "Chamadas",
    "description": "Chamadas ainda indisponível; não pode ser ativado nesta etapa.",
    "permissions": [],
    "availability": "RESEARCH",
    "navigation": false,
    "dependencies": [],
    "base": false,
    "entitlement": null
  },
  {
    "code": "team.permissions",
    "module": "Gestão",
    "name": "Equipe e permissões",
    "description": "Equipe e permissões da organização selecionada, conforme permissões efetivas e regras operacionais.",
    "permissions": [
      "team.read",
      "team.permissions.manage"
    ],
    "availability": "AVAILABLE",
    "navigation": true,
    "dependencies": [],
    "base": true,
    "entitlement": null
  },
  {
    "code": "providers.management",
    "module": "Gestão",
    "name": "Canais e integrações",
    "description": "Canais e integrações da organização selecionada, conforme permissões efetivas e regras operacionais.",
    "permissions": [
      "providers.manage"
    ],
    "availability": "AVAILABLE",
    "navigation": true,
    "dependencies": [],
    "base": true,
    "entitlement": null
  },
  {
    "code": "providers.demo",
    "module": "Gestão",
    "name": "Simulador Demo",
    "description": "Simulador Demo da organização selecionada, conforme permissões efetivas e regras operacionais.",
    "permissions": [
      "providers.simulate"
    ],
    "availability": "AVAILABLE",
    "navigation": true,
    "dependencies": [
      "chat.text"
    ],
    "base": true,
    "entitlement": null
  },
  {
    "code": "organization.usage",
    "module": "Gestão",
    "name": "Uso e custos",
    "description": "Uso e custos ainda indisponível; não pode ser ativado nesta etapa.",
    "permissions": [],
    "availability": "PLANNED",
    "navigation": false,
    "dependencies": [],
    "base": false,
    "entitlement": null
  },
  {
    "code": "organization.subscription",
    "module": "Gestão",
    "name": "Plano e assinatura",
    "description": "Plano e assinatura ainda indisponível; não pode ser ativado nesta etapa.",
    "permissions": [],
    "availability": "PLANNED",
    "navigation": false,
    "dependencies": [],
    "base": false,
    "entitlement": null
  },
  {
    "code": "chat.settings",
    "module": "Preferências",
    "name": "Configurações",
    "description": "Configurações ainda indisponível; não pode ser ativado nesta etapa.",
    "permissions": [],
    "availability": "PLANNED",
    "navigation": false,
    "dependencies": [],
    "base": false,
    "entitlement": null
  }
];
