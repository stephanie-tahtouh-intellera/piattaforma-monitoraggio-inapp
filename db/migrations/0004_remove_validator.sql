-- DEC-109: il ruolo Validatore è soppresso. Si rimuovono l'utente e i dati che lo referenziano; le anomalie passano all'Ufficio Gare.
-- Il vincolo CHECK sui ruoli di `users` resta com'è: SQLite non lo modifica senza ricreare la tabella e nessuna riga può più usare il valore.
DELETE FROM notification_reads
 WHERE user_id IN (SELECT id FROM users WHERE role = 'VALIDATOR')
    OR notification_id IN (SELECT id FROM alert_notifications WHERE user_id IN (SELECT id FROM users WHERE role = 'VALIDATOR'));
DELETE FROM alert_notifications WHERE user_id IN (SELECT id FROM users WHERE role = 'VALIDATOR');
DELETE FROM sessions
 WHERE user_id IN (SELECT id FROM users WHERE role = 'VALIDATOR')
    OR impersonated_by IN (SELECT id FROM users WHERE role = 'VALIDATOR');
DELETE FROM users WHERE role = 'VALIDATOR';
UPDATE alerts SET owner = 'PROCUREMENT' WHERE owner = 'VALIDATOR';
