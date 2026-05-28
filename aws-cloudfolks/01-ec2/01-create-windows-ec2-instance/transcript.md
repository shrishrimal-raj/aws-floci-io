Hello and welcome back.

Now in this video we are going to create our first EC2 instance.

We will create windows instance.

See there are many options that we need to understand when we are going to create our instance.

But I will give you overview or detailed explanation of each and every option that we are going to get

while we are creating our EC2 instance for sure.

But what is my point of view right now that I want you to create one EC2 instance first so you can experience

AWS graphical user interface, right?

You know that.

What is EC2 and how we can create instance like what is EC2 instance.

So I want that.

Let's create one EC2 instance.

First.

You guys will follow me on this video, and you can also create your first EC2 instance in your account.

And then we will discuss about all the options that we are getting during our EC2 instance creation.

Right?

So right now I am on my console.

I want to create EC2 instance.

So what I can do I am going to type EC2 over here.

I got this virtual server in the cloud.

Now first of all I want to create this in Mumbai.

So I am going to change my region from Virginia to Mumbai.

It means now I will create this instance in Mumbai region.

Right now everything is 000 over here.

It means I don't have any virtual machine or EC2 instance running right.

So now I want to create this.

So I am going to click on launch instance.

Once you click on Launch Instance, here we have a single screen window.

And from here we can create this.

So first of all I have to give name I'm going to give name my new windows.

EC2.

You can give any name according to your convenience okay so I just provide a name.

Now here we have to select Amazon Machine Image.

Now this is very interesting.

See suppose if you want if you have physical server right.

This first step is in this physical server you need to install operating system.

Now to install operating system you have to decide that windows Linux.

Now if you are going to install windows you have to go to the Microsoft website.

Then you have to download 6 to 7 gb ISO file.

Then you have to create bootable pendrive and then you can start installation using this pendrive.

So you have to install operating system.

And installing operating system is actually very time consuming.

But here we are not going to install operating system using this traditional way.

Here we just need to select Amazon Machine Image, which is actually one kind of predefined template.

They have a they have Linux templates.

They have windows Ami images.

So there is there are lots of images over there.

You just need to select images according to your requirement.

I am going to explain you detail about a in upcoming video.

I am just giving you overview and then we are going to use this.

So for example I want to create Windows Server 2019 right now.

Okay.

So how I can do this.

So here I can click on browse more am I see I am getting list of all the armies here we have AWS, Linux

AWS having their own Linux.

They call it Amazon Linux.

Then we have Mac OS.

We have Red Hat Linux, we have Linux okay.

So it is like almost all kind of operating systems Ami images are available.

But right now I want to create windows right.

So I am going to click on all windows.

So it is actually providing me a list of all windows.

Now here I have Microsoft Windows Server 2022 base.

Here core.

Core means it is like command line only.

But my target is to have 2019, right?

So see Microsoft Windows Server 2019 base.

Okay.

So I'm going to select this.

Now.

When you are going to select your Ami you have to make sure that here free tier eligible must be there.

If you are going to select without this tag it will be chargeable to you.

Okay.

So take care about this.

For example, suppose if you want to install Microsoft Server 2022 with SQL server.

So what will happen?

You will get Microsoft Server ready with SQL server also installed.

Now suppose if I am going to select this.

Okay, I am getting my operating system with my software pre-installed as well.

But look at this free tier eligible tag is not there.

It means if I will select this I have to pay right?

So whenever you are going to perform any lab, please make sure that you are selecting free tier eligible

images, right?

So right now I am going to select 2019 base okay.

Free tier eligible.

Let me select this.

So now we will get our EC2 instance ready with Windows Server 2019.

Right here we have this.

We will discuss about Ami in detail because we need to understand so many things about am I right?

For example see here we have what is this EBS and all this.

So no need to worry.

Upcoming video.

You will get it.

Now here you can select instance type.

For example, if you are going to buy any new computer or laptop, what your vendor will ask you will

ask you that okay, you are going to buy laptop, but what is your use case?

If you are saying that okay, I want to play game, then the configuration will be high.

He will provide you computer with proper CPU, with a proper Ram, with proper display card and all

this.

If you are telling that, you know, I just want to learn AWS, you will say that okay, you can buy

only normal average computer worth rupees 30,000.

Same way when you are going to buy a server, the configuration of the server is the most important

part.

Now here you can select or compare all the servers that they have, right?

So here we have one virtual CPU one GB of Ram.

Look at this.

Here we have 96 virtual CPU.

Right.

And 192 GB of Ram.

So they have predefined set of configuration that you can select.

How to select this.

Which options are best suitable.

Which options you are going to select.

If you are going to configure database, which option you are going to select.

If you have application which require lots of CPU.

We will discuss about this.

What is this storage.

Storage type.

Everything we are going to discuss.

But right now.

Right now we are just going to select this T2 micro.

In this we are going to get one virtual CPU and one GB Ram.

But it is enough right?

Why I am selecting this.

It is free tier right?

We want to learn everything but we don't want to give any money to AWS, right?

So I am going to select T2 micro.

We will discuss about instance type in detail in upcoming video.

So don't worry.

But yes whenever you are going to perform lab just select T2 micro right now.

Here we have key pair C key pair is actually used to Authenticate with your server.

Now, once you create your server, you have to access this as well.

Now to access this server you must have this key pair right.

So you have to create key pair right now.

Then you have to store this on a safe place.

Whenever you want to access this server you will use this okay.

It is like your key to access your server.

Now you can create one key and use it with the various any number of EC2 instance.

Or you can create separate key for your each and every EC2 instance.

I have some keys available.

See this right?

But we are creating our first EC2 instance.

If you click over here, you don't have anything right?

So what I am doing I am going to click on Create new key pair.

I am going to say.

Cloud.

Fox.

Key.

Going to use RSA.

There is another option which is known as edX 2519 which is actually providing faster access.

And it is also very secure, but it is only available when you are going to use Linux instance.

Right?

So we are going to like we are creating windows instance.

So I am going with RSA.

The key file extension will be PEM.

There is another extension PPK as well.

But we will discuss about this when we will create Linux instance.

Right.

So I am going to click on Create key pair.

Now it will download this key pair on my computer.

Keep this in mind.

You can not download this key letter.

Or if you know this there is no way to access your instance, right?

So let me click on save.

Right now.

I just saved this key in my download folder.

Do not change any location, just store this into the download folder right now.

Then, now here it is asking me about networking setting.

We will discuss about this.

This is option.

We call it Virtual Private Cloud.

We will discuss about VPC in upcoming milestone.

Right now we are not going to change anything, but we need to take care about two things.

First, when you click on edit over here see here we have subnets for current.

I am saying you that from here you can select your availability zone here.

If you remember about our video of AWS Global Infrastructure in Mumbai.

Right now we are in Mumbai.

They have three availability zones.

Right now I am going to create my resources in AP South one A.

So I am just selecting AP South one A.

If you are not selecting anything, like if you are selecting no preference over here, it will try

to create your EC2 instance in any availability zone.

Right.

So AWS will decide this right now.

If you want to decide this you can select from here.

We will discuss about subnet and all this but just giving you this option.

Yeah.

Now here we have auto assign public IP.

In the introduction I already told you that your EC2 instance will be in Mumbai region.

Inside Mumbai region they have AP South one a availability zone.

Now your virtual machine will be created over there.

Now I want to access this from my desk.

Right.

So once this server will be ready, I will access this.

Now how I will access this using internet.

But what will be the identification here?

It is identification of my instance public IP.

Once our instance will be ready we will talk about this because using this public IP we are going to

access our instance okay.

Now here we have security group.

Security group is used to protect your instance because security group is used to filter traffic.

So whatever the traffic going to your EC2 instance.

So inbound and outbound traffic can be controlled using this security group.

Now without security group you cannot create EC2 instance.

So it will create security group automatically.

If you want to change name you can.

For example I am going to say my SG.

But to understand security group We must have idea about tcp IP.

We must need to like.

We need to understand what is firewall, what is TCP and UDP port number.

So there are many things.

So we will create separate video for this.

But right now it will create security group automatically and it will allow RDP.

RDP means you can access your server remotely from your office.

And it will enable this automatically if you are creating windows instance.

If you are creating Linux Linux instance, it will automatically allow SSH right?

RDP port number 3389.

So it is automatically allowed.

Now here you can select that okay I want to access this server from specific IP.

So you can select custom and you can provide IP address.

You can say that I want to access this from my office.

So my IP.

It will automatically provide a detach your IP.

Now you can only access your server from this IP.

But we don't want this kind of security right now.

So what I'm going to say I am going to access this instance anywhere.

I can only use RDP remote desktop okay.

So now it is done.

Not change anything.

Just change the name okay.

Now this is known as storage.

See.

Suppose if you are going to buy a laptop they will definitely ask you right that what is the storage

requirement.

One TB or 512 GB.

Same way here.

It will provide you 30 GB volume.

Now this volume is actually root volume.

It means it will install operating system inside this particular volume.

Now let me give you an example.

So suppose if I am going to open my explorer over here.

Right.

If you go to this PC.

See here we have this window sign.

What is the meaning of this window sign?

This window sign is actually indicating this.

Out of this CDEF4 volume I have.

This is actually root volume.

In this root volume I have windows operating system installed.

So same way when you have your EC2 instance AWS will provide you root volume with 32 GB so it can install

operating system inside this.

If you are going to create Linux instance it will provide you eight GB volume.

Now if you want to add additional storage you can also add this.

But we are not going to add this right now.

We just want to create our first EC2 instance.

Right.

So we are just going with the flow.

floor.

Then we will add.

We will do lots of experiment with this.

Now it is done.

If you want to set up more, you can click on advance.

Here we have many options available.

Write user Data script is one of the most important options we will discuss about this step by step.

Picture is not over yet, it is just started now.

Here I am getting last option that number of instance.

For example, if I want to create three Windows Server I will say three.

If I want to create five, I can say five.

Right now I want to create one.

So I'm just going to select one.

But keep this in mind that suppose if I am going to create select two over here, all two instances

will be in the AP South one A right.

Because this will be in the same availability zone If you want to create two EC2 instances in a different

availability zone, you have to create one first, and then you have to create a second.

And that time you have to select AP South one B.

Right.

Why we need to create this.

We will discuss about this as well.

Now everything is ready.

Let me click on launch instance.

Successfully initiate and launch instance and let me click on View All instances.

So right now it is ready.

I think I selected two over there.

So it is actually created two.

No need to worry.

We can terminate this.

Okay.

It was my mistake.

But you guys take care.

Just create one instance.

Now when you create your instance, sometime it will be in the pending state.

Then it will be in the running state.

So now your server is in the running state.

Same way.

It will take some time.

Here you will get status check two by two right now.

So if you go to the status here it is a system status check.

So it will verify AWS system and then it will verify your instance status check.

So here you will get two by two status check.

Right now it is initializing.

So we need we have to wait.

Yeah I will be back once.

We will get two by two status check.

And then I will tell you how we can access our EC2 instance from my windows system.

Yeah okay I got two by two check pass.

So my instance is now ready.

Now I want to access this okay.

How I can do this.

So you have to select your instance.

Suppose if I am going to select this instance here you got your IP address.

And here it is a name as well.

So using this public IP you are able to access this instance here.

They are actually providing us very easy system.

So what I am doing selecting my EC2 instance, see each EC2 instance having a different or a unique

public IP right?

There is a private IP address as well.

We will discuss about this, but right now using this public IP I can access my EC2 instance.

Okay.

So I am going to select this.

Click on connect.

Click on RDP client and it is going to download the Remote Desktop file.

So you can download this.

And then you just need to click on it.

So it will connect to your server using the IP address or DNS name.

Even if you are using DNS name it is going to use IP.

Okay.

So you can say that it is going to connect with you connect using IP address.

Now it is actually connecting and it is asking me for username and password.

Now if you have windows, the username is always administrator.

Now password.

If you remember this we have downloaded this PEM file.

And this PEM file is actually in my download folder.

So what I will do I will click on Get password.

Yeah I have to wait for this because it will take up to four minutes.

Yeah.

Wait.

Yes.

So now it is done.

Let me click on upload upload private key file.

I have this key file in my download folder.

It is key file right.

Now if you forget the name or if you have many files, you can also verify this.

Let me tell you this as well.

See if you go to your EC2 instance.

Okay.

Here.

Key pair assigned to it at launch.

You can find it out right.

But yes, this PEM file must be in your system.

So let me do this.

Let me connect RDP download remote desktop file.

Click on it.

Connect here I got administrator I will go to get password upload private file download and here decrypt

password.

And here I got my password.

Now select this and paste this.

So now I am able to access my EC2 instance.

Yeah.

So this is my Windows server.

Now I can use this same as I have in my physical environment.

Right.

So this is my windows server.

I can shut down this.

I can manage this.

So everything is possible.

It is same as you are accessing machine in your premises.

Right?

So this is my windows machine screen right.

If you have multiple right now I just created two instance accidentally.

You can also access another EC2 instance as well.

Right.

Procedure remains same.

Now suppose if you don't want to use it you can close this okay.

Now when you go to console it will show you that your EC2 instance is running.

You can access this any time by clicking on connect.

But here you have one problem.

The problem is when you will connect this every time you have to generate password, right?

Let me connect again.

See I am going to click on connect RDP client.

Download this file.

I am downloading every time.

You can save this once and access it any time.

Connect.

Again it is asking me password.

So I need to click on get password.

Upload a file.

Now it works.

Decrypt.

Copy and paste it right.

So now you are thinking that you know every time I need to generate password it is problematic.

Yeah it is, but if you don't want to do this, there is a way as well what you can do once you have

your windows system.

Okay.

Now you are already logged in.

You can go to server manager.

You know I am just going to change windows password so you can go to server manager.

Go to tools, then go to computer management.

Once your server is ready.

Okay.

You have to change administrator password.

Then this password will be your login password.

Here you will get local user and group users.

And here I have administrator.

User.

Right click set password.

Proceed.

Done.

Now I am going to close this.

Now next time if I want to access this what I can do.

Download remote file.

Save.

Connect.

Now when it is asking me for password I will enter Indian at the rate one two, three.

It is like password that I have configured.

And now I am able to access my servers.

So now I do not need to generate password every time using this security key.

So this is how the system is actually working.

We will configure web server over here.

There are many things that we are going to configure.

But this is what in this video we are going to complete this.

Then how to create our EC2 instance.

Windows instance.

Now when you click over here you are going to get all the details IP address and all this okay you also

we are also going to get detail about which platform you have right now.

If you don't want this instance what you can do, you can select them.

You can go to instance that you can stop this instance.

So it will be power off your virtual machine.

You can reboot this.

It is like restarting your virtual machine if you terminate the instance your both instances.

I just selected both so my both instance will be deleted forever.

Keep this in mind.

One mind.

Once you terminate this, there is no way that you are going to get it back.

And if you are learning this, once you complete your practical, always terminate your instance.

This is what I have done over here.

I have also terminated terminated my windows instance as well, right?

So this is our first step about how to create windows EC2 instance.

In the next video we are going to create Linux instance, right?

Don't worry about options we have because all the options we are going to talk about in depth right.

Thank you very much.

See you in the next video.

Have a nice day.

Goodbye.

