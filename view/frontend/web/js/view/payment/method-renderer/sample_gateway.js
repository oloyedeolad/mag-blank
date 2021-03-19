/**
 * Copyright © 2016 Magento. All rights reserved.
 * See COPYING.txt for license details.
 */
/*browser:true*/
/*global define*/
define(
    [
        "jquery",
        'Magento_Checkout/js/view/payment/default',
        "Magento_Checkout/js/action/place-order",
        "Magento_Checkout/js/model/payment/additional-validators",
        "Magento_Checkout/js/model/quote",
        "Magento_Checkout/js/model/full-screen-loader",
        "Magento_Checkout/js/action/redirect-on-success",
        "mage/url"
    ],
    function (
        $,
        Component,
        placeOrderAction,
        additionalValidators,
        quote,
        fullScreenLoader,
        redirectOnSuccessAction,
        url) {
        'use strict';

        return Component.extend({
            defaults: {
                template: 'Magento_SamplePaymentGateway/payment/form',
                transactionResult: ''
            },


            initialize: function() {
                this._super();
                var tempCheckoutConfig = window.checkoutConfig;
                var localGladepayConfiguration =
                    tempCheckoutConfig.payment.sample_gateway;

                // Add Gladepay Gateway script to head
                if (localGladepayConfiguration.mode == "live") {
                    $("head").append(
                        '<script type="text/javascript" src="https://klastatic.fra1.cdn.digitaloceanspaces.com/test/js/klasha-integration.js"></script>'
                    );
                } else {
                    $("head").append(
                        '<script type="text/javascript" src="https://klastatic.fra1.cdn.digitaloceanspaces.com/test/js/klasha-integration.js"></script>'
                    );
                }
            },

            initObservable: function () {

                this._super()
                    .observe([
                        'transactionResult'
                    ]);
                return this;
            },

            getCode: function() {
                return 'sample_gateway';
            },

            getData: function() {
                return {
                    'method': this.item.method,
                    'additional_data': {
                        'transaction_result': this.transactionResult()
                    }
                };
            },

            getTransactionResults: function() {
                return _.map(window.checkoutConfig.payment.sample_gateway.transactionResults, function(value, key) {
                    return {
                        'value': key,
                        'transaction_result': value
                    }
                });
            },

            /**
             * @override
             */
            afterPlaceOrder: function() {
                var checkoutConfig = window.checkoutConfig;
                var paymentData = quote.billingAddress();
                var configuration = checkoutConfig.sample_gateway;

                if (checkoutConfig.isCustomerLoggedIn) {
                    var customerData = checkoutConfig.customerData;
                    paymentData.email = customerData.email;
                    // paymentData.phone = customerData.phone;
                    console.log("Customer Data: ", customerData)
                } else {
                    var storageData = JSON.parse(
                        localStorage.getItem("mage-cache-storage")
                    )["checkout-data"];
                    paymentData.email = quote.guestEmail;
                    console.log("storage Data: ", storageData);
                }

                var quoteId = checkoutConfig.quoteItemData[0].quote_id;
                var total = quote.totals();
                console.log(total)
                var _this = this;
                _this.isPlaceOrderActionAllowed(false);
                console.log(quote);
                console.log("Payment Data: ", paymentData);
                var dstCurrency = ""
                if (paymentData.countryId === "NG") {
                    dstCurrency = "NGN"
                } else if (paymentData.countryId === "KE") {
                    dstCurrency = "KES"
                }
                var kit = {
                    currency: dstCurrency,
                    callback: "",
                    phone: paymentData.telephone,
                    email: paymentData.email,
                    fullname: paymentData.firstname + " " + paymentData.lastname,
                    tx_ref: makeid(10),
                    paymentType: "mag",
                    callBack: callWhenDone,
                }

                var $div = $('<div />').appendTo('body');
                $div.attr('id', 'holdy');
                function makeid(length) {
                    var result = "";
                    var characters =
                        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                    var charactersLength = characters.length;
                    for (var i = 0; i < length; i++) {
                        result += characters.charAt(Math.floor(Math.random() * charactersLength));
                    }
                    return result;
                }


                function callWhenDone(response) {
                    console.log("Here is response: ", response);
                    $.ajax({
                        method: "GET",
                        url:"https://ktests.com/nucleus/wordpressstatus/" + data.txnRef + "/" + quoteId,
                    }).success(function (data) {
                        console.log("here is data: ", data);
                        if (data.status === "successful") {
                            redirectOnSuccessAction.execute();
                            return;
                        }

                        _this.isPlaceOrderActionAllowed(true);
                        _this.messageContainer.addErrorMessage({
                            message: data.message === null ? "Error, please try again" : data.message
                        });

                        //redirect for failed transctions
                        fullScreenLoader.startLoader();
                        window.location.replace(url.build(configuration.failed_page_url));

                        return _this;
                    }).error(function() {
                        if (response.status === 200 && response.txnStatus === 'successful') {
                            redirectOnSuccessAction.execute();
                            return;
                        } else {
                            _this.isPlaceOrderActionAllowed(true);
                            _this.messageContainer.addErrorMessage({
                                message: response.message === null ? "Error, please try again" : data.message
                            });

                            //redirect for failed transctions
                            fullScreenLoader.startLoader();
                            window.location.replace(url.build(configuration.failed_page_url));
                        }
                    });
                }

                var client = new KlashaClient(
                    "KRS7QdS8itVSL6rt86oI1usJGuYL0f7XNAULLhbrWCv3mAz38p93d3xCpuh0Vxvx",
                    1,
                    total.base_grand_total,
                    "holdy",
                    "",
                    paymentData.countryId,
                    total.base_currency_code,
                    kit
                );
                client.initi();
            },

        });
    }
);
