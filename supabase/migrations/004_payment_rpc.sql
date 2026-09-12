create or replace function public.register_payment(p_installment uuid,p_amount numeric,p_method text,p_notes text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare v_inst loan_installments%rowtype; v_loan loans%rowtype; v_customer customers%rowtype; v_payment uuid; v_new_paid numeric; v_status text;
begin
 select * into v_inst from loan_installments where id=p_installment for update; if not found then raise exception 'Parcela não encontrada'; end if;
 if not public.is_company_member(v_inst.company_id) then raise exception 'Sem permissão'; end if;
 if p_amount<=0 then raise exception 'Valor inválido'; end if;
 if p_amount > (v_inst.amount-v_inst.paid_amount+v_inst.late_fee_amount-v_inst.discount_amount) then raise exception 'Pagamento maior que o saldo'; end if;
 select * into v_loan from loans where id=v_inst.loan_id; select * into v_customer from customers where id=v_loan.customer_id;
 v_new_paid:=v_inst.paid_amount+p_amount; v_status:=case when v_new_paid >= v_inst.amount+v_inst.late_fee_amount-v_inst.discount_amount then 'PAID' else 'PARTIAL' end;
 insert into payments(company_id,loan_id,installment_id,customer_id,received_by,amount,payment_method,notes) values(v_inst.company_id,v_inst.loan_id,v_inst.id,v_customer.id,auth.uid(),p_amount,p_method,p_notes) returning id into v_payment;
 update loan_installments set paid_amount=v_new_paid,remaining_amount=greatest(0,amount+late_fee_amount-discount_amount-v_new_paid),status=v_status,paid_at=case when v_status='PAID' then now() else paid_at end,updated_at=now() where id=v_inst.id;
 insert into cash_movements(company_id,type,category,description,amount,reference_type,reference_id,created_by) values(v_inst.company_id,'INCOME','PAYMENT','Pagamento de parcela',p_amount,'PAYMENT',v_payment,auth.uid());
 return v_payment;
end; $$;
