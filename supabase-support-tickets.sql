-- Tabela de Tickets de Suporte
create table public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  status text check (status in ('open', 'in_progress', 'resolved', 'closed')) default 'open',
  subject text, -- Resumo gerado pela IA ou digitado pelo usuário
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  assigned_to uuid references public.users(id), -- ID do admin que assumiu
  priority text check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium'
);

-- Habilitar RLS (Row Level Security)
alter table public.support_tickets enable row level security;

-- Políticas de Acesso
-- Usuários podem ver apenas seus próprios tickets
create policy "Users can view own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

-- Usuários podem criar tickets
create policy "Users can create tickets"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

-- Admins podem ver todos os tickets (Regra baseada em email do admin ou role específica se houver)
-- Por enquanto, vamos permitir que admins vejam tudo. 
-- Idealmente teríamos uma role 'admin', mas vamos usar uma política permissiva para leitura por enquanto para o painel admin funcionar.
-- Ajuste conforme sua lógica de admin (ex: email específico)
create policy "Admins can view all tickets"
  on public.support_tickets for select
  using (
    exists (
      select 1 from public.users 
      where id = auth.uid() 
      and (email = 'admin@phantom.app' or is_admin = true) -- Exemplo, ajuste conforme seu sistema de admin
    )
  );

-- Admins podem atualizar tickets (assumir, fechar, responder)
create policy "Admins can update tickets"
  on public.support_tickets for update
  using (
    exists (
      select 1 from public.users 
      where id = auth.uid() 
      and (email = 'admin@phantom.app' or is_admin = true)
    )
  );

-- Trigger para atualizar updated_at
create trigger handle_updated_at before update on public.support_tickets
  for each row execute procedure moddatetime (updated_at);
