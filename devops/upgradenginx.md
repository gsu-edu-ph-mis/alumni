# Upgrade nginx 1.18.0 to 1.26.1

## Ubuntu 20.04, 22.04

Install the prerequisites:

    sudo apt install curl gnupg2 ca-certificates lsb-release ubuntu-keyring

Import an official nginx signing key so apt could verify the packages authenticity. Fetch the key:


    curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor \
        | sudo tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null

Verify that the downloaded file contains the proper key:

    gpg --dry-run --quiet --no-keyring --import --import-options import-show /usr/share/keyrings/nginx-archive-keyring.gpg

The output should contain the full fingerprint 573BFD6B3D8FBC641079A6ABABF5BD827BD9BF62 as follows:

    pub   rsa2048 2011-08-19 [SC] [expires: 2027-05-24]
        573BFD6B3D8FBC641079A6ABABF5BD827BD9BF62
    uid                      nginx signing key <signing-key@nginx.com>

Note that the output can contain other keys used to sign the packages.

To set up the apt repository for stable nginx packages, run the following command:

    echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
    http://nginx.org/packages/ubuntu `lsb_release -cs` nginx" \
        | sudo tee /etc/apt/sources.list.d/nginx.list

If you would like to use mainline nginx packages, run the following command instead:

    echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
    http://nginx.org/packages/mainline/ubuntu `lsb_release -cs` nginx" \
        | sudo tee /etc/apt/sources.list.d/nginx.list

Set up repository pinning to prefer our packages over distribution-provided ones:

    echo -e "Package: *\nPin: origin nginx.org\nPin: release o=nginx\nPin-Priority: 900\n" \
        | sudo tee /etc/apt/preferences.d/99nginx

To install nginx, run the following commands:

    sudo apt update
    sudo apt install nginx


    sudo nano /etc/nginx/nginx.conf

User should be `user  www-data;` and `server_tokens off;`

Comment out and add this lines:

    #include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;

Full code:

    user  www-data;
    worker_processes  auto;

    error_log  /var/log/nginx/error.log notice;
    pid        /var/run/nginx.pid;


    events {
        worker_connections  1024;
    }


    http {
        include       /etc/nginx/mime.types;
        default_type  application/octet-stream;

        log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent" "$http_x_forwarded_for"';

        access_log  /var/log/nginx/access.log  main;

        sendfile        on;
        #tcp_nopush     on;

        server_tokens off;

        keepalive_timeout  65;

        #gzip  on;

        #include /etc/nginx/conf.d/*.conf;
        include /etc/nginx/sites-enabled/*;
    }
