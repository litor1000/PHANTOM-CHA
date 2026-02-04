-- ==========================================================
-- BACKUP E AUDITORIA DE MENSAGENS (PHANTOM AUDIT)
-- ==========================================================

-- 1. Criar tabela de auditoria para mensagens deletadas
CREATE TABLE IF NOT EXISTS public.audit_log_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_message_id UUID,
    content TEXT,
    sender_id UUID,
    receiver_id UUID,
    type TEXT,
    image_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Função para fazer o backup antes de deletar
CREATE OR REPLACE FUNCTION backup_deleted_message()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_log_messages (
        original_message_id, 
        content, 
        sender_id, 
        receiver_id, 
        type, 
        image_url, 
        metadata, 
        created_at
    ) VALUES (
        OLD.id, 
        OLD.content, 
        OLD.sender_id, 
        OLD.receiver_id, 
        OLD.type, 
        OLD.image_url, 
        OLD.metadata, 
        OLD.created_at
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para capturar a deleção (mensagens expiradas)
DROP TRIGGER IF EXISTS message_audit_trigger ON public.messages;
CREATE TRIGGER message_audit_trigger
    BEFORE DELETE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION backup_deleted_message();

-- 4. Permissões
GRANT SELECT ON public.audit_log_messages TO service_role; -- Apenas o admin/sistema vê o backup
