export type Language = "es" | "en" | "pt";

export const I18N = {
  es: {
    home_office: "Mi Oficina", my_clients: "Mis Clientes", research: "Research", home_link: "Inicio", radar: "Radar", prospects: "Prospectos",
    export_pdf: "Exportar a PDF", dark_mode: "☾ Modo oscuro", light_mode: "☀ Modo claro",
    save: "Guardar", cancel: "Cancelar", edit: "Editar", close: "Cerrar", delete: "Borrar",
    back_to_clients: "← Mis Clientes", consolidated: "Consolidado", add_account: "+ agregar cuenta",
    tasks: "Tareas", new_task: "+ Nueva tarea", task_title: "Título de la tarea", due_date: "Vencimiento",
    no_tasks: "No hay tareas pendientes.", mark_done: "Marcar hecha", pending_tasks: "Tareas pendientes de todos los clientes",
    meeting_prep: "Preparar reunión", meeting_prep_generating: "Armando el resumen de la reunión…",
    meeting_prep_hint: "Resumen de 1 página con estado de la cartera, rendimiento reciente y pendientes.",
    risk_profile: "Perfil de riesgo", risk_questionnaire: "Cuestionario de idoneidad", complete_questionnaire: "Completar cuestionario",
    risk_result: "Perfil resultante", risk_not_done: "Todavía no se completó el cuestionario de idoneidad para este cliente.",
    risk_deviation: "Desvío vs. perfil de riesgo", risk_deviation_hint: "Compara la asignación real de la cartera contra el portafolio modelo de su perfil.",
    research_assistant: "IA Advisor", ask_placeholder: "Preguntá algo sobre fondos, mercados, portafolios o tus clientes…",
    send: "Enviar", thinking: "Pensando…", language: "Idioma",
    client_data: "datos del cliente", full_name: "Nombre completo", birth_date: "Fecha de nacimiento",
    address: "Dirección", email: "Email", mobile: "Celular", spouse: "Pareja", children: "Hijos",
    no_personal_data: 'Todavía no cargaste los datos personales de este cliente — tocá "Editar" para completarlos.',
  },
  en: {
    home_office: "My Office", my_clients: "My Clients", research: "Research", home_link: "Home", radar: "Radar", prospects: "Prospects",
    export_pdf: "Export to PDF", dark_mode: "☾ Dark mode", light_mode: "☀ Light mode",
    save: "Save", cancel: "Cancel", edit: "Edit", close: "Close", delete: "Delete",
    back_to_clients: "← My Clients", consolidated: "Consolidated", add_account: "+ add account",
    tasks: "Tasks", new_task: "+ New task", task_title: "Task title", due_date: "Due date",
    no_tasks: "No pending tasks.", mark_done: "Mark done", pending_tasks: "Pending tasks across all clients",
    meeting_prep: "Prepare meeting", meeting_prep_generating: "Building the meeting summary…",
    meeting_prep_hint: "1-page summary with portfolio status, recent performance and open items.",
    risk_profile: "Risk profile", risk_questionnaire: "Suitability questionnaire", complete_questionnaire: "Complete questionnaire",
    risk_result: "Resulting profile", risk_not_done: "The suitability questionnaire hasn't been completed for this client yet.",
    risk_deviation: "Deviation vs. risk profile", risk_deviation_hint: "Compares the actual portfolio allocation against the model portfolio for their profile.",
    research_assistant: "IA Advisor", ask_placeholder: "Ask something about funds, markets, portfolios or your clients…",
    send: "Send", thinking: "Thinking…", language: "Language",
    client_data: "client data", full_name: "Full name", birth_date: "Date of birth",
    address: "Address", email: "Email", mobile: "Mobile phone", spouse: "Spouse", children: "Children",
    no_personal_data: 'You haven\'t added this client\'s personal data yet — tap "Edit" to fill it in.',
  },
  pt: {
    home_office: "Meu Escritório", my_clients: "Meus Clientes", research: "Pesquisa", home_link: "Início", radar: "Radar", prospects: "Prospectos",
    export_pdf: "Exportar para PDF", dark_mode: "☾ Modo escuro", light_mode: "☀ Modo claro",
    save: "Salvar", cancel: "Cancelar", edit: "Editar", close: "Fechar", delete: "Excluir",
    back_to_clients: "← Meus Clientes", consolidated: "Consolidado", add_account: "+ adicionar conta",
    tasks: "Tarefas", new_task: "+ Nova tarefa", task_title: "Título da tarefa", due_date: "Vencimento",
    no_tasks: "Não há tarefas pendentes.", mark_done: "Marcar concluída", pending_tasks: "Tarefas pendentes de todos os clientes",
    meeting_prep: "Preparar reunião", meeting_prep_generating: "Montando o resumo da reunião…",
    meeting_prep_hint: "Resumo de 1 página com status da carteira, desempenho recente e pendências.",
    risk_profile: "Perfil de risco", risk_questionnaire: "Questionário de adequação", complete_questionnaire: "Preencher questionário",
    risk_result: "Perfil resultante", risk_not_done: "O questionário de adequação ainda não foi preenchido para este cliente.",
    risk_deviation: "Desvio vs. perfil de risco", risk_deviation_hint: "Compara a alocação real da carteira com a carteira modelo do seu perfil.",
    research_assistant: "IA Advisor", ask_placeholder: "Pergunte algo sobre fundos, mercados, carteiras ou seus clientes…",
    send: "Enviar", thinking: "Pensando…", language: "Idioma",
    client_data: "dados do cliente", full_name: "Nome completo", birth_date: "Data de nascimento",
    address: "Endereço", email: "Email", mobile: "Celular", spouse: "Cônjuge", children: "Filhos",
    no_personal_data: 'Você ainda não cadastrou os dados pessoais deste cliente — toque em "Editar" para preenchê-los.',
  },
} as const satisfies Record<Language, Record<string, string>>;

export type I18nKey = keyof (typeof I18N)["es"];

export function t(lang: Language, key: I18nKey): string {
  return I18N[lang]?.[key] ?? I18N.es[key] ?? key;
}
