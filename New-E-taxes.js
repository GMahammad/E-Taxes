// ==UserScript==
// @name         New-E-taxes
// @namespace    http://tampermonkey.net/
// @version      0.0.3
// @description  Automatically fetch and display tax data.
// @run-at       document-start
// @author       Mahammad Gulalov
// @match        https://new.e-taxes.gov.az/*
// @exclude      https://new.e-taxes.gov.az/eportal/az/invoice/view/*
// @icon         https://qaime.e-taxes.gov.az/assets/images/placeholder.jpg
// @connect
// ==/UserScript==
(function () {
    'use strict';

    const observeUrlChanges = () => {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        const handleUrlChange = () => {
            const currentUrl = window.location.href;
            if (currentUrl.includes('https://new.e-taxes.gov.az/eportal/az/invoice')) {
                startObserving();
            }
        };

        history.pushState = function (...args) {
            originalPushState.apply(this, args);
            handleUrlChange();
        };

        history.replaceState = function (...args) {
            originalReplaceState.apply(this, args);
            handleUrlChange();
        };

        window.addEventListener('popstate', handleUrlChange);

        handleUrlChange();
    };

    const initializeButton = () => {
        const container = document.querySelector(".vhf-page-list-controls-sort-right");
        if (container && !document.querySelector("#fetch-tax-button")) {
            fetchButton(container);
        }
    };

    const observePageChanges = () => {
        const observer = new MutationObserver(() => {
            initializeButton();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        initializeButton();
    };

    const startObserving = () => {
        observePageChanges();
    };

    // Function to add the fetch button
    function creatingLoadingTab(container) {
        const loadingTab = document.createElement('div');
        loadingTab.className = 'loading-tab'
        loadingTab.style.position = 'fixed';
        loadingTab.style.top = '0';
        loadingTab.style.left = '0';
        loadingTab.style.width = '100%';
        loadingTab.style.height = '100%';
        loadingTab.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        loadingTab.style.color = 'white';
        loadingTab.style.textAlign = 'center';
        loadingTab.style.display = 'flex';
        loadingTab.style.justifyContent = 'center';
        loadingTab.style.alignItems = 'center';
        loadingTab.style.fontSize = '1.5rem';
        loadingTab.style.zIndex = '1000';
        container.appendChild(loadingTab);
        return loadingTab;
    }

    function creatingFetchButton(container) {
        const btn = document.createElement('button');
        btn.id = "fetch-tax-button";
        btn.type = 'button';
        btn.className = 'mr-2 btn btn-outline-primary';
        btn.style.width = '100%';
        btn.textContent = 'Bütün qaimələri çap et';
        container.prepend(btn);
        return btn;
    }

    function fetchButton(container) {
        const btn = creatingFetchButton(container);
        btn.addEventListener('click', async () => {
            const taxLinks = document.querySelectorAll('a[href^="/eportal/az/invoice/view/"]');
            if (taxLinks.length === 0) {
                alert("Heç bir elektron qaimə fakturası tapılmadı.");
                return;
            }

            const loadingTab = creatingLoadingTab(container);
            const extractedData = [];
            const batchSize = 1;
            const delay = 30

            for (let i = 0; i < taxLinks.length; i += batchSize) {
                loadingTab.innerText = 'Zəhmət olmasa gözləyin. \n Qaimələr Yüklənir...  ' + i + ' / ' + taxLinks.length;
                const batch = Array.from(taxLinks).slice(i, i + batchSize);
                const batchPromises = batch.map(link => {
                    return fetchIframeContent(link.href)
                        .then(content => {
                            extractedData.push({
                                link: link.href,
                                content
                            });
                        })
                        .catch(error => {
                            alert('Məlumatlar yüklənərkən xəta baş verdi! Link:', link.href, error);
                        });
                });

                await Promise.all(batchPromises);
                if (i + batchSize < taxLinks.length) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            container.removeChild(loadingTab);
            openDataInNewTab(extractedData)
        });


    }

    function fetchIframeContent(link) {
        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = link;

            document.body.appendChild(iframe);

            const checkInterval = 200;
            const timeout = 10000;
            let elapsedTime = 0;

            const interval = setInterval(() => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                    const eqfStatus = iframeDoc.querySelector('#root > div.root-view.container-fluid > div > div.wizard-content_idCHojiIPgobhUlvG70cj.wizard-content-additional > div > div > div > div.tablelist-view.pt-0.mt-4 > div > div > div > div.d-flex.align-items-center > span')
                    const eqfSerial = iframeDoc.querySelector('#root > div.root-view.container-fluid > div > div.wizard-content_idCHojiIPgobhUlvG70cj.wizard-content-additional > div > div > div > div.tablelist-view.pt-0.mt-4 > div > div > h3');
                    const eqfMainType = iframeDoc.querySelector('#root > div.root-view.container-fluid > div > div.wizard-content_idCHojiIPgobhUlvG70cj.wizard-content-additional > div > div > div > div.tablelist-view.pt-0.mt-4 > div > div > h6');
                    const eqfType = iframeDoc.querySelector('#root > div.root-view.container-fluid > div > div.wizard-content_idCHojiIPgobhUlvG70cj.wizard-content-additional > div > div > div > div.tablelist-view.pt-0.mt-4 > div > div > div > div.d-flex.align-items-center > div')
                    const eqfTable = iframeDoc.querySelector('#simple-tabpanel-0 > div > div > table > tbody:nth-child(3)')

                    const isOptional = iframeDoc.querySelector('#root > div.root-view.container-fluid > div > div.wizard-content_idCHojiIPgobhUlvG70cj.wizard-content-additional > div > div > div > div:nth-child(2) > div > div.button-pack.p-3.my-3')
                    var eqfSenderVoenAndName;
                    var eqfDate;
                    var isEqfSender;
                    if (eqfTable && eqfSerial && eqfTable && eqfMainType && eqfType) {
                        if (isOptional) {
                            isEqfSender = iframeDoc.querySelector('#root > div.root-view.container-fluid > div > div.wizard-content_idCHojiIPgobhUlvG70cj.wizard-content-additional > div > div > div > div:nth-child(2) > div > div:nth-child(2) > div.w-50.text-left > div.typography.caption')
                            eqfSenderVoenAndName = iframeDoc.querySelector('#root > div.root-view.container-fluid > div > div.wizard-content_idCHojiIPgobhUlvG70cj.wizard-content-additional > div > div > div > div:nth-child(2) > div > div:nth-child(2) > div.w-50.text-left > div.mb-4.font-weight-bold.mt-2')
                            eqfDate = iframeDoc.querySelector('#root > div.root-view.container-fluid > div > div.wizard-content_idCHojiIPgobhUlvG70cj.wizard-content-additional > div > div > div > div:nth-child(2) > div > div:nth-child(3) > div:nth-child(3) > div.mb-4.font-weight-bold.mt-2')
                        } else {
                            isEqfSender = iframeDoc.querySelector('#root > div.root-view.container-fluid > div > div.wizard-content_idCHojiIPgobhUlvG70cj.wizard-content-additional > div > div > div > div:nth-child(2) > div > div:nth-child(1) > div.w-50.text-left > div.typography.caption')
                            eqfSenderVoenAndName = iframeDoc.querySelector('#root > div.root-view.container-fluid > div > div.wizard-content_idCHojiIPgobhUlvG70cj.wizard-content-additional > div > div > div > div:nth-child(2) > div > div:nth-child(1) > div.w-50.text-left > div.mb-4.font-weight-bold.mt-2')
                            eqfDate = iframeDoc.querySelector('#root > div.root-view.container-fluid > div > div.wizard-content_idCHojiIPgobhUlvG70cj.wizard-content-additional > div > div > div > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(3) > div.mb-4.font-weight-bold.mt-2')
                        }
                        clearInterval(interval); // Stop polling
                        document.body.removeChild(iframe); // Clean up the iframe
                        const rows = eqfTable.querySelectorAll('tr');
                        const rowData = [];
                        rows.forEach(row => {
                            const cells = row.querySelectorAll('td');
                            const cellValues = Array.from(cells).map(cell => cell.textContent.trim());
                            rowData.push(cellValues);
                        });



                        const extractedData = {
                            isEqfSender: checkSecondWordStartsWithT(isEqfSender),
                            eqfMainType: eqfMainType.textContent.trim(),
                            eqfType: eqfType.textContent.trim(),
                            eqfStatus: eqfStatus.textContent.trim(),
                            eqfSenderVOEN: eqfSenderVoenAndName.textContent.trim().split(' / ')[0],
                            eqfSerial: eqfSerial.textContent.trim().substring(23, eqfSerial.textContent.trim().length),
                            eqfSenderName: eqfSenderVoenAndName.textContent.trim().split(' / ')[1],
                            eqfDate: eqfDate.textContent.trim().split(' ')[0],
                            tableRows: rowData
                        };

                        resolve(extractedData);
                    } else if (elapsedTime >= timeout) {
                        clearInterval(interval);
                        document.body.removeChild(iframe);
                        reject(new Error('Məlumat verilmiş vaxt limitində yüklənə bilmədi'));
                    }

                    elapsedTime += checkInterval;
                } catch (error) {
                    clearInterval(interval);
                    document.body.removeChild(iframe);
                    reject(new Error('Xəta baş verdi: ' + error.message));
                }
            }, checkInterval);


        });
    }

    function checkSecondWordStartsWithT(html) {
        const trimmedString = html.textContent.trim()
        const words = trimmedString.split(' ');

        if (words.length > 1 && words[1].toLowerCase().startsWith('t')) {
            return true;
        } else {
            return false;
        }
    }

    function openDataInNewTab(data) {
        const newTab = window.open('EQF Table', '_blank');
        if (!newTab) {
            alert("Yeni tab açmaq mümkün olmadı. Zəhmət olmasa brauzerin pop-up blocker ayarlarını yoxlayın.");
            return;
        }

        const style = `
    <style>
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 5px 0;
            font-size: 12px;
            text-align: left;
        }
        th, td {
            padding: 4px;
            border: 1px solid #ddd;
        }
        th {
            background-color: #f4f4f4;
        }
    </style>
    `;

        const tableHeader = `
    <tr>
        <th>№</th>
        <th>Tipi</th>
        <th>Növü</th>
        <th>EQF Statusu</th>
        <th>Təqdim/Əldə edənin VÖEN-i</th>
        <th>Təqdim/Əldə edənin adı</th>
        <th>EQF Tarixi</th>
        <th>EQF Seriyası</th>
        <th>Malın adı</th>
        <th>Malın Kodu</th>
        <th>Əmtəənin qlobal identifikasiya nömrəsi (GTIN)</th>
        <th>Ölçü Vahidi</th>
        <th>Malın miqdarı</th>
        <th>Malın buraxılış qiyməti</th>
        <th>Cəmi qiyməti</th>
        <th>Aksiz dərəcəsi(%)</th>
        <th>Aksiz məbləği(AZN)</th>
        <th>Cəmi</th>
        <th>ƏDV-yə 18 faiz dərəcə ilə cəlb edilən</th>
        <th>ƏDV-yə "0" dərəcə ilə cəlb edilən</th>
        <th>ƏDV-dən azad olunan</th>
        <th>ƏDV-yə cəlb edilməyən</th>
        <th>ƏDV məbləği</th>
        <th>Yol vergisi (manatla)</th>
        <th>Yekun məbləğ</th>
        <th>Mal/Xidmət</th>
        <th>Emala verilən mallardan istifadə edilən(silinən) malların dəyəri</th>
    </tr>
    `;

        let rowCounter = 1;
        let totals = Array(13).fill(0.0);

        const tableRows = data.map(entry => {
            const entryCounter = rowCounter++;
            let isProcessEqf = entry.content.eqfMainType.startsWith("Emal prosesi keçmiş");
            return entry.content.tableRows.map(row => {
                for (let i = 5; i <= 17; i++) {
                    const value = row[i];
                    if (value !== undefined && value !== null) {
                        const cleanedValue = value.replace(/\s/g, '').replace(',', '.');
                        totals[i - 5] += parseFloat(cleanedValue) || 0;
                    }
                    if((entry.content.eqfMainType == "Malların emala yaxud saxlamaya verilməsi barədə elektron qaimə-faktura" || "Malların, işlərin və xidmətlərin təqdim edilməsi barədə elektron qaimə-faktura") && row.length < 10 && (i == 10 || i ==17)){
                        const cleanedValue = row[7].replace(/\s/g, '').replace(',', '.');
                        totals[i - 5] += parseFloat(cleanedValue) || 0;
                    }
                    if((entry.content.eqfMainType == "Malların emala yaxud saxlamaya verilməsi barədə elektron qaimə-faktura" || "Malların, işlərin və xidmətlərin təqdim edilməsi barədə elektron qaimə-faktura") && row.length > 10 && (i == 10 || i ==17)){
                        const cleanedValue = row[8].replace(/\s/g, '').replace(',', '.');
                        totals[i - 5] += parseFloat(cleanedValue) || 0;
                    }
                    if(isProcessEqf){
                      totals[3] = 0;
                    }
                        else {
                        totals[i - 5] += 0;
                    }
                }

                return `
        <tr>
            <td>${entryCounter}</td>
            <td>${entry.content.eqfType || 'N/A'}</td>
            <td>${entry.content.eqfMainType || 'N/A'}</td>
            <td>${entry.content.eqfStatus || 'N/A'}</td>
            <td>${entry.content.eqfSenderVOEN || 'N/A'}</td>
            <td>${entry.content.eqfSenderName || 'N/A'}</td>
            <td>${entry.content.eqfDate || 'N/A'}</td>
            <td>${entry.content.eqfSerial || 'N/A'}</td>
            <td>${row[1]}</td>
            <td>${row[2]}</td>
            <td>${row[3] || '0'}</td>
            <td>${row[4]}</td>
            <td>${row[5]}</td>
            <td>${row[6]}</td>
            <td>${isProcessEqf ? '0' : row[7] || '0'}</td>
            <td>${isProcessEqf ? '0' : row[8] || '0'}</td>
            <td>${row[9] || '0'}</td>
            ${entry.content.eqfMainType == "Malların emala yaxud saxlamaya verilməsi barədə elektron qaimə-faktura" || "Malların, işlərin və xidmətlərin təqdim edilməsi barədə elektron qaimə-faktura" ? `<td>${row[7]}</td>` : `<td>${row[10] || '0'}</td>`}
            <td>${row[11] || '0'}</td>
            <td>${row[12] || '0'}</td>
            <td>${row[13] || '0'}</td>
            <td>${row[14] || '0'}</td>
            <td>${row[15] || '0'}</td>
            <td>${row[16] || '0'}</td>
            ${entry.content.eqfMainType == "Malların emala yaxud saxlamaya verilməsi barədə elektron qaimə-faktura" || "Malların, işlərin və xidmətlərin təqdim edilməsi barədə elektron qaimə-faktura" ? `<td>${row[7]}</td>` : `<td>${row[17] || '0'}</td>`}
            <td>${row[2].substring(0, 2) === "99" ? "Xidmət" : "Mal"}</td>
            ${isProcessEqf ? `<td>${row[8] || '0'}</td>` : '<td>0<td>'}
        </tr>
    `;
            }).join('')
        }).join('');


        const totalsRow = `
<tr>
    <td colspan="12"><strong>Сəmi</strong></td>
    ${totals.map(total => `<td>${total.toFixed(2)}</td>`).join('')}
    <td colspan="13"></td>
</tr>
`;

        const htmlContent = `
<html>
<head>
    <title>EQF Table</title>
    ${style}
</head>
<body>
    <table>
        <thead>
            ${tableHeader}
        </thead>
        <tbody>
            ${tableRows}
            ${totalsRow}
        </tbody>
    </table>
</body>
</html>
`;

        newTab.document.open();
        newTab.document.write(htmlContent);
        newTab.document.close();

    }

    observeUrlChanges()

})();