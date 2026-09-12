export type LoanStatus="PENDING"|"ACTIVE"|"PAID"|"OVERDUE"|"CANCELLED"|"DEFAULTED";
export type Loan={id:string;customer_id:string;amount:number;interest_rate:number;term:number;frequency:string;total_amount:number;installment_amount:number;status:LoanStatus;created_at:string};
