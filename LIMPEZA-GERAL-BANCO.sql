-- ==========================================================
-- SCRIPT DE LIMPEZA GERAL (NUCLEAR RESET)
-- Use este script para limpar o histórico e liberar espaço
-- ==========================================================

-- 1. LIMPAR TODAS AS MENSAGENS (TEXTO E FOTOS)
-- Isso vai zerar o chat para todos os usuários
TRUNCATE TABLE public.messages CASCADE;

-- 2. LIMPAR TODAS AS TRANSAÇÕES DE COMPRA/VENDA (OPCIONAL)
-- Se quiser zerar o histórico financeiro também, descomente a linha abaixo:
-- TRUNCATE TABLE public.transactions CASCADE;

-- 3. LIMPAR TODAS AS CONVERSAS CADASTRADAS (LISTA DE CHATS)
TRUNCATE TABLE public.conversations CASCADE;

-- 4. LIMPAR TODOS OS ÁLBUNS DE FOTOS DOS USUÁRIOS
TRUNCATE TABLE public.user_albums CASCADE;

-- 5. LIMPAR CONTATOS SALVOS
TRUNCATE TABLE public.contacts CASCADE;

-- ==========================================================
-- DICA: Se você quiser deletar apenas as fotos e manter os textos:
-- DELETE FROM public.messages WHERE type = 'image';
-- ==========================================================
