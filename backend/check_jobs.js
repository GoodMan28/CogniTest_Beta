const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/cognitest').then(async () => {
    const jobs = await mongoose.connection.db.collection('ingestionjobs').find({}).toArray();
    console.log("Total jobs:", jobs.length);
    console.log("Statuses:");
    jobs.forEach(j => {
        console.log(`- ${j.pdfName}: ${j.status} (Processed: ${j.processedPages}/${j.totalPages})`);
        if (j.errorMessage) console.log(`  Error: ${j.errorMessage}`);
    });
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
