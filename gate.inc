proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header Connection "";
proxy_set_header X-Forwarded-Proto https;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_request_buffering on;
proxy_buffering on;
client_max_body_size 1m;
proxy_connect_timeout 2s;
proxy_read_timeout 70s;
error_page 502 = @panel_direct;   # only when the gate is not running (never re-sends a request the panel already got)
