#!/bin/bash
cd /root/Loyalty/backend
/usr/bin/node dist/jobs/generateGoldMonthlyVouchers.js >> /var/log/gold-vouchers.log 2>&1
